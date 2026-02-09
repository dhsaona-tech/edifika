"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getUser";

// Tipos
export type UnitCredit = {
  id: string;
  condominium_id: string;
  unit_id: string;
  amount: number;
  remaining_amount: number;
  source_payment_id: string | null;
  created_at: string;
  expires_at: string | null;
  status: "activo" | "aplicado" | "expirado" | "devuelto";
  // Joined data
  unit?: {
    id: string;
    identifier: string;
    full_identifier: string;
  } | null;
  source_payment?: {
    id: string;
    folio_rec: number | null;
  } | null;
};

export type CreditApplication = {
  id: string;
  credit_id: string;
  charge_id: string;
  amount_applied: number;
  applied_at: string;
  notes: string | null;
  is_reversed: boolean;
  // Joined data
  charge?: {
    id: string;
    period: string | null;
    description: string | null;
    total_amount: number;
  } | null;
};

export type UnitCreditSummary = {
  unit_id: string;
  unit_identifier: string;
  unit_full_identifier: string;
  total_credit_available: number;
  active_credits_count: number;
};

/**
 * Obtener todos los créditos de un condominio
 */
export async function listCredits(
  condominiumId: string,
  filters?: {
    unitId?: string;
    status?: "activo" | "aplicado" | "expirado" | "devuelto";
  }
): Promise<UnitCredit[]> {
  const supabase = await createClient();

  let query = supabase
    .from("unit_credits")
    .select(
      `
      *,
      unit:units(id, identifier, full_identifier),
      source_payment:payments(id, folio_rec)
    `
    )
    .eq("condominium_id", condominiumId)
    .order("created_at", { ascending: false });

  if (filters?.unitId) {
    query = query.eq("unit_id", filters.unitId);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  } else {
    // Por defecto, solo activos
    query = query.eq("status", "activo");
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listando créditos:", error);
    return [];
  }

  return (data || []).map((c: any) => ({
    ...c,
    unit: Array.isArray(c.unit) ? c.unit[0] : c.unit,
    source_payment: Array.isArray(c.source_payment) ? c.source_payment[0] : c.source_payment,
  }));
}

/**
 * Obtener créditos activos de una unidad específica
 */
export async function getUnitCredits(condominiumId: string, unitId: string): Promise<UnitCredit[]> {
  return listCredits(condominiumId, { unitId, status: "activo" });
}

/**
 * Obtener el saldo total a favor de una unidad
 */
export async function getUnitCreditBalance(unitId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_unit_credit_balance", {
    p_unit_id: unitId,
  });

  if (error) {
    console.error("Error obteniendo saldo de crédito:", error);
    return 0;
  }

  return Number(data) || 0;
}

/**
 * Obtener resumen de créditos de todas las unidades con saldo a favor
 */
export async function getUnitsWithCredit(condominiumId: string): Promise<UnitCreditSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_units_with_available_credit", {
    p_condominium_id: condominiumId,
  });

  if (error) {
    console.error("Error obteniendo unidades con crédito:", error);
    return [];
  }

  return (data || []).map((u: any) => ({
    unit_id: u.unit_id,
    unit_identifier: u.unit_identifier,
    unit_full_identifier: u.unit_identifier,
    total_credit_available: Number(u.total_credit) || 0,
    active_credits_count: Number(u.credits_count) || 0,
  }));
}

/**
 * Aplicar crédito a un cargo (Cruce de cuentas)
 */
export async function applyCreditToCharge(
  condominiumId: string,
  creditId: string,
  chargeId: string,
  amount: number,
  notes?: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (amount <= 0) {
    return { success: false, error: "El monto debe ser mayor a cero" };
  }

  const { data, error } = await supabase.rpc("apply_credit_to_charge", {
    p_credit_id: creditId,
    p_charge_id: chargeId,
    p_amount: amount,
    p_applied_by: user?.id || null,
    p_notes: notes || null,
  });

  if (error) {
    console.error("Error aplicando crédito:", error);
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; error?: string };

  if (!result.success) {
    return { success: false, error: result.error || "Error desconocido" };
  }

  revalidatePath(`/app/${condominiumId}/credits`);
  revalidatePath(`/app/${condominiumId}/charges`);

  return { success: true, data: result };
}

/**
 * Crear crédito manual (ajuste administrativo)
 */
export async function createManualCredit(
  condominiumId: string,
  unitId: string,
  amount: number,
  _description: string
): Promise<{ success: boolean; error?: string; creditId?: string }> {
  const supabase = await createClient();

  if (amount <= 0) {
    return { success: false, error: "El monto debe ser mayor a cero" };
  }

  const { data, error } = await supabase
    .from("unit_credits")
    .insert({
      condominium_id: condominiumId,
      unit_id: unitId,
      amount: amount,
      remaining_amount: amount,
      status: "activo",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creando crédito manual:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/app/${condominiumId}/credits`);

  return { success: true, creditId: data.id };
}

/**
 * Cancelar/Anular un crédito
 */
export async function cancelCredit(
  condominiumId: string,
  creditId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!reason.trim()) {
    return { success: false, error: "Debe ingresar el motivo de cancelación" };
  }

  const { data, error } = await supabase.rpc("cancel_credit", {
    p_credit_id: creditId,
    p_cancelled_by: user?.id || null,
    p_reason: reason.trim(),
  });

  if (error) {
    console.error("Error cancelando crédito:", error);
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; error?: string };

  if (!result.success) {
    return { success: false, error: result.error || "Error desconocido" };
  }

  revalidatePath(`/app/${condominiumId}/credits`);

  return { success: true };
}

/**
 * Obtener historial de aplicaciones de un crédito
 */
export async function getCreditApplications(creditId: string): Promise<CreditApplication[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("credit_applications")
    .select(
      `
      *,
      charge:charges(id, period, description, total_amount)
    `
    )
    .eq("credit_id", creditId)
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("Error obteniendo aplicaciones de crédito:", error);
    return [];
  }

  return (data || []).map((a: any) => ({
    ...a,
    charge: Array.isArray(a.charge) ? a.charge[0] : a.charge,
  }));
}

/**
 * Obtener cargos pendientes de una unidad (para aplicar créditos)
 */
export async function getPendingChargesForCredit(
  condominiumId: string,
  unitId: string
): Promise<
  {
    id: string;
    period: string | null;
    description: string | null;
    due_date: string | null;
    total_amount: number;
    balance: number;
    expense_item_name: string | null;
  }[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("charges")
    .select(
      `
      id,
      period,
      description,
      due_date,
      total_amount,
      balance,
      expense_item:expense_items(name)
    `
    )
    .eq("condominium_id", condominiumId)
    .eq("unit_id", unitId)
    .eq("status", "pendiente")
    .gt("balance", 0)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error obteniendo cargos pendientes:", error);
    return [];
  }

  return (data || []).map((c: any) => ({
    id: c.id,
    period: c.period,
    description: c.description,
    due_date: c.due_date,
    total_amount: c.total_amount,
    balance: c.balance,
    expense_item_name: Array.isArray(c.expense_item) ? c.expense_item[0]?.name : c.expense_item?.name,
  }));
}

/**
 * Aplicar créditos automáticamente al cargo más antiguo (FIFO)
 * Usado opcionalmente al generar cargos mensuales
 */
export async function autoApplyCreditsToCharge(
  condominiumId: string,
  chargeId: string,
  maxAmount?: number
): Promise<{ success: boolean; totalApplied: number; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Obtener el cargo
  const { data: charge, error: chargeError } = await supabase
    .from("charges")
    .select("id, unit_id, balance")
    .eq("id", chargeId)
    .eq("condominium_id", condominiumId)
    .single();

  if (chargeError || !charge) {
    return { success: false, totalApplied: 0, error: "Cargo no encontrado" };
  }

  if (charge.balance <= 0) {
    return { success: true, totalApplied: 0 };
  }

  // Obtener créditos activos de la unidad (FIFO - más antiguos primero)
  const { data: credits, error: creditsError } = await supabase
    .from("unit_credits")
    .select("id, remaining_amount")
    .eq("unit_id", charge.unit_id)
    .eq("status", "activo")
    .gt("remaining_amount", 0)
    .order("created_at", { ascending: true });

  if (creditsError || !credits || credits.length === 0) {
    return { success: true, totalApplied: 0 };
  }

  let remainingToApply = maxAmount !== undefined ? Math.min(maxAmount, charge.balance) : charge.balance;
  let totalApplied = 0;

  for (const credit of credits) {
    if (remainingToApply <= 0) break;

    const amountToApply = Math.min(remainingToApply, credit.remaining_amount);

    const { data: result, error: applyError } = await supabase.rpc("apply_credit_to_charge", {
      p_credit_id: credit.id,
      p_charge_id: chargeId,
      p_amount: amountToApply,
      p_applied_by: user?.id || null,
      p_notes: "Aplicación automática",
    });

    if (applyError) {
      console.error("Error en aplicación automática de crédito:", applyError);
      continue;
    }

    const res = result as { success: boolean; amount_applied?: number };
    if (res.success && res.amount_applied) {
      totalApplied += res.amount_applied;
      remainingToApply -= res.amount_applied;
    }
  }

  revalidatePath(`/app/${condominiumId}/credits`);
  revalidatePath(`/app/${condominiumId}/charges`);

  return { success: true, totalApplied };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getUser";
import {
  PaymentApplyChargesInput,
  PaymentDirectInput,
  PaymentGeneralInput,
  paymentApplyChargesSchema,
  paymentDirectSchema,
  paymentGeneralSchema,
} from "@/lib/payments/schemas";

type PaymentFilters = {
  status?: "disponible" | "cancelado";
  method?: string;
  accountId?: string;
  unitId?: string;
  expenseItemId?: string;
  from?: string;
  to?: string;
};

type ChargeForPayment = {
  id: string;
  period: string | null;
  expense_item?: { name?: string | null } | null;
  description?: string | null;
  due_date?: string | null;
  total_amount: number;
  paid_amount: number;
  balance: number;
};

function normalizeReason(text: string) {
  return (text || "").trim() || "Anulado por administrador";
}

export async function listarPayments(condominiumId: string, filters?: PaymentFilters) {
  const supabase = await createClient();
  let query = supabase
    .from("payments")
    .select("*")
    .eq("condominium_id", condominiumId)
    .order("folio_rec", { ascending: false, nullsFirst: false })
    .order("payment_date", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  } else {
    // excluir anulados por defecto
    query = query.neq("status", "cancelado");
  }
  if (filters?.method) query = query.eq("payment_method", filters.method);
  if (filters?.accountId) query = query.eq("financial_account_id", filters.accountId);
  if (filters?.unitId) query = query.eq("unit_id", filters.unitId);
  if (filters?.expenseItemId) query = query.eq("expense_item_id", filters.expenseItemId);
  if (filters?.from) query = query.gte("payment_date", filters.from);
  if (filters?.to) query = query.lte("payment_date", filters.to);

  const { data, error } = await query;
  if (error) {
    console.error("Error listando payments (simple)", error);
    return [];
  }
  const payments = data || [];

  // Enriquecer nombres sin usar joins para evitar errores de cache/RLS
  const unitIds = payments.map((p) => p.unit_id).filter(Boolean) as string[];
  const payerIds = payments.map((p) => p.payer_profile_id).filter(Boolean) as string[];
  const accountIds = payments.map((p) => p.financial_account_id).filter(Boolean) as string[];
  const expenseIds = payments.map((p) => p.expense_item_id).filter(Boolean) as string[];

  const [unitsRes, payersRes, accountsRes, expensesRes, contactsRes] = await Promise.all([
    unitIds.length
      ? supabase.from("units").select("id, full_identifier, identifier").in("id", unitIds)
      : Promise.resolve({ data: [] as any[] }),
    payerIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", payerIds)
      : Promise.resolve({ data: [] as any[] }),
    accountIds.length
      ? supabase.from("financial_accounts").select("id, bank_name, account_number").in("id", accountIds)
      : Promise.resolve({ data: [] as any[] }),
    expenseIds.length
      ? supabase.from("expense_items").select("id, name").in("id", expenseIds)
      : Promise.resolve({ data: [] as any[] }),
    unitIds.length
      ? supabase
          .from("unit_contacts")
          .select("unit_id, is_primary_contact, end_date, profiles(id, full_name)")
          .in("unit_id", unitIds)
          .eq("is_primary_contact", true)
          .is("end_date", null)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const unitsMap = new Map<string, any>();
  const payersMap = new Map<string, any>();
  const accountsMap = new Map<string, any>();
  const expensesMap = new Map<string, any>();
  const contactMap = new Map<string, any>();

  (unitsRes.data || []).forEach((u) => unitsMap.set(u.id, u));
  (payersRes.data || []).forEach((p) => payersMap.set(p.id, p));
  (accountsRes.data || []).forEach((a) => accountsMap.set(a.id, a));
  (expensesRes.data || []).forEach((e) => expensesMap.set(e.id, e));
  (contactsRes.data || []).forEach((c: any) => {
    if (c.unit_id && c.profiles) contactMap.set(c.unit_id, c.profiles);
  });

  return payments.map((p) => ({
    ...p,
    unit: unitsMap.get(p.unit_id) || null,
    payer: payersMap.get(p.payer_profile_id) || contactMap.get(p.unit_id) || null,
    financial_account: accountsMap.get(p.financial_account_id) || null,
    expense_item: expensesMap.get(p.expense_item_id) || null,
    attachment_url: (p as any).attachment_url ?? null,
  }));
}

export async function listarPaymentsAnulados(condominiumId: string) {
  return listarPayments(condominiumId, { status: "cancelado" });
}

export async function getPendingCharges(condominiumId: string, unitId: string): Promise<ChargeForPayment[]> {
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
      paid_amount,
      balance,
      expense_item:expense_items(name)
    `
    )
    .eq("condominium_id", condominiumId)
    .eq("unit_id", unitId)
    .eq("status", "pendiente")
    .order("due_date", { ascending: true });
  if (error) {
    console.error("Error cargando cargos pendientes", error);
    return [];
  }
  return (data || []).map((c: any) => ({
    id: c.id,
    period: c.period,
    expense_item: Array.isArray(c.expense_item) ? c.expense_item[0] : c.expense_item,
    description: c.description,
    due_date: c.due_date,
    total_amount: c.total_amount,
    paid_amount: c.paid_amount,
    balance: c.balance,
  }));
}

export async function getFinancialAccounts(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_accounts")
    .select("id, bank_name, account_number, current_balance, account_type, is_active")
    .eq("condominium_id", condominiumId)
    .eq("is_active", true)
    .order("bank_name");
  if (error) return [];
  return data || [];
}

export async function getIncomeExpenseItems(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_items")
    .select("id, name")
    .eq("condominium_id", condominiumId)
    .eq("category", "ingreso")
    .eq("is_active", true)
    .order("name");
  if (error) return [];
  return data || [];
}

export async function getUnitsBasic(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .select("id, identifier, full_identifier")
    .eq("condominium_id", condominiumId)
    .eq("status", "activa")
    .order("identifier");
  if (error) return [];
  return data || [];
}

export async function createPayment(
  condominiumId: string,
  payload: {
    general: PaymentGeneralInput;
    apply?: PaymentApplyChargesInput | null;
    direct?: PaymentDirectInput | null;
  }
) {
  const parsedGeneral = paymentGeneralSchema.parse(payload.general);
  const parsedApply = payload.apply ? paymentApplyChargesSchema.parse(payload.apply) : null;
  const parsedDirect = payload.direct ? paymentDirectSchema.parse(payload.direct) : null;

  const supabase = await createClient();

  const allocations = parsedApply?.allocations || [];
  const allocatedSum = allocations.reduce((acc, a) => acc + Number(a.amount_allocated || 0), 0);
  if (allocatedSum > parsedGeneral.total_amount) {
    return { error: "La suma asignada supera el monto del pago." };
  }

  const invalidAlloc = allocations.find((a) => a.amount_allocated > a.charge_balance);
  if (invalidAlloc) {
    return { error: "No puedes asignar mas que el saldo del cargo." };
  }

  // ✅ ELIMINADO: reserve_folio_rec
  // El trigger assign_folio_rec() lo hace automáticamente

  const { data, error } = await supabase.rpc("apply_payment_to_charges", {
    in_condominium_id: condominiumId,
    in_financial_account_id: parsedGeneral.financial_account_id,
    in_payment_date: parsedGeneral.payment_date,
    in_total_amount: parsedGeneral.total_amount,
    in_payment_method: parsedGeneral.payment_method,
    in_reference_number: parsedGeneral.reference_number || null,
    in_notes: parsedGeneral.notes || null,
    in_payer_profile_id: parsedGeneral.payer_profile_id || null,
    in_unit_id: parsedApply?.unit_id || parsedDirect?.unit_id || null,
    in_expense_item_id: parsedDirect?.expense_item_id || parsedApply?.expense_item_id_for_remainder || null,
    in_allocations: allocations.map((a) => ({
      charge_id: a.charge_id,
      amount_allocated: a.amount_allocated,
    })),
    // ✅ ELIMINADO: in_folio_rec (el trigger lo asigna automáticamente)
  });

  if (error) {
    console.error("Error creando payment", error);
    return { error: error.message || "No se pudo crear el ingreso." };
  }

  revalidatePath(`/app/${condominiumId}/payments`);
  return { success: true, paymentId: data as string };
}

export async function cancelPayment(
  condominiumId: string,
  paymentId: string,
  reason: string,
  cancelledByProfileId?: string
) {
  const normalizedReason = (reason || "").trim();
  if (!normalizedReason) {
    return { error: "Debes ingresar el motivo de anulación." };
  }
  
  const supabase = await createClient();
  
  let profileId = cancelledByProfileId;
  if (!profileId) {
    const user = await getCurrentUser();
    profileId = user?.id || undefined;
  }
  
  const cancelledBy = profileId || null;
  
  // ✅ Usar la función anular_payment que instalamos esta mañana
  const { data, error } = await supabase.rpc('anular_payment', {
    p_payment_id: paymentId,
    p_cancelled_by_profile_id: cancelledBy,
    p_cancellation_reason: normalizedReason
  });
  
  if (error) {
    console.error("Error anulando payment", error);
    return { error: error.message || "No se pudo anular el ingreso." };
  }
  
  revalidatePath(`/app/${condominiumId}/payments`);
  revalidatePath(`/app/${condominiumId}/payments/${paymentId}`);
  
  return { success: true, result: data };
}

export async function listPendingReports(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_reports")
    .select("*")
    .eq("condominium_id", condominiumId)
    .eq("status", "pendiente_revision")
    .order("payment_date", { ascending: false });
  if (error) {
    console.warn("No se pudieron cargar payment_reports (se devuelve lista vacía). Detalle:", error?.message || error);
    return [];
  }
  return data || [];
}

export async function approvePaymentReport(
  condominiumId: string,
  reportId: string,
  input: {
    financial_account_id: string;
    autoAllocateOldest?: boolean;
    manualAllocations?: PaymentApplyChargesInput["allocations"];
  }
) {
  const supabase = await createClient();
  const { data: report, error } = await supabase
    .from("payment_reports")
    .select("*, unit:units(id)")
    .eq("id", reportId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (error || !report) return { error: "Reporte no encontrado" };

  const general = paymentGeneralSchema.parse({
    condominium_id: condominiumId,
    financial_account_id: input.financial_account_id,
    payment_date: report.payment_date,
    total_amount: report.amount,
    payment_method: report.payment_method,
    reference_number: report.reference_number || "",
    notes: report.comment || "",
    payer_profile_id: report.profile_id || undefined,
  });

  let allocations = input.manualAllocations || [];
  if (input.autoAllocateOldest) {
    const charges = await getPendingCharges(condominiumId, report.unit_id);
    let remaining = report.amount;
    allocations = [];
    for (const c of charges) {
      if (remaining <= 0) break;
      const applyAmount = Math.min(remaining, Number(c.balance || 0));
      if (applyAmount > 0) {
        allocations.push({
          charge_id: c.id,
          amount_allocated: applyAmount,
          charge_balance: c.balance,
        });
        remaining -= applyAmount;
      }
    }
  }

  const res = await createPayment(condominiumId, {
    general,
    apply: report.unit_id
      ? {
          unit_id: report.unit_id,
          allocations,
          allow_unassigned: true,
        }
      : null,
    direct: null,
  });

  if ("error" in res && res.error) return { error: res.error };
  const paymentId = (res as { paymentId?: string }).paymentId;

  const { error: updateError } = await supabase
    .from("payment_reports")
    .update({
      status: "aprobado",
      generated_payment_id: paymentId,
      processed_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (updateError) {
    console.error("Error actualizando payment_report", updateError);
    return { error: "Pago creado pero no se pudo actualizar el reporte." };
  }

  revalidatePath(`/app/${condominiumId}/payment-reports`);
  return { success: true, paymentId };
}

export async function rejectPaymentReport(condominiumId: string, reportId: string, reason: string) {
  const supabase = await createClient();
  const motivo = normalizeReason(reason);
  const { error } = await supabase
    .from("payment_reports")
    .update({ status: "rechazado", rejection_reason: motivo })
    .eq("id", reportId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("Error rechazando payment_report", error);
    return { error: "No se pudo rechazar el reporte." };
  }

  revalidatePath(`/app/${condominiumId}/payment-reports`);
  return { success: true };
}
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getUser";
import { logAudit } from "@/lib/audit/logAudit";
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

export async function getPaymentDetail(condominiumId: string, paymentId: string) {
  const supabase = await createClient();

  // Obtener el pago
  const { data: payment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("condominium_id", condominiumId)
    .single();

  if (error || !payment) {
    console.error("Error obteniendo payment detail", error);
    return null;
  }

  // Cargar relaciones en paralelo
  const [unitRes, payerRes, accountRes, allocationsRes, contactRes] = await Promise.all([
    payment.unit_id
      ? supabase.from("units").select("id, full_identifier, identifier").eq("id", payment.unit_id).single()
      : Promise.resolve({ data: null }),
    payment.payer_profile_id
      ? supabase.from("profiles").select("id, full_name").eq("id", payment.payer_profile_id).single()
      : Promise.resolve({ data: null }),
    payment.financial_account_id
      ? supabase
          .from("financial_accounts")
          .select("id, bank_name, account_number")
          .eq("id", payment.financial_account_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("payment_allocations")
      .select(
        `
        id,
        amount_allocated,
        charge:charges(
          id,
          unit_id,
          period,
          description,
          due_date,
          total_amount,
          balance,
          expense_item:expense_items(name)
        )
      `
      )
      .eq("payment_id", paymentId),
    payment.unit_id
      ? supabase
          .from("unit_contacts")
          .select("unit_id, profiles(id, full_name)")
          .eq("unit_id", payment.unit_id)
          .eq("is_primary_contact", true)
          .is("end_date", null)
          .limit(1)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const allocations = (allocationsRes.data || []).map((a: any) => ({
    id: a.id,
    amount_allocated: a.amount_allocated,
    charge: Array.isArray(a.charge) ? a.charge[0] : a.charge,
  }));

  // Determinar payer: primero payer_profile_id, sino el contacto principal de la unidad
  let payer = payerRes.data || null;
  if (!payer && contactRes.data && contactRes.data.length > 0) {
    const contact = contactRes.data[0];
    payer = Array.isArray(contact.profiles) ? contact.profiles[0] : contact.profiles;
  }

  return {
    ...payment,
    unit: unitRes.data || null,
    payer,
    financial_account: accountRes.data || null,
    allocations,
  };
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

  // ✅ VALIDACIÓN SERVIDOR: Re-fetch balances reales desde DB (no confiar en cliente)
  if (allocations.length > 0) {
    const chargeIds = allocations.map((a) => a.charge_id);
    const { data: realCharges, error: chargesError } = await supabase
      .from("charges")
      .select("id, balance, status")
      .in("id", chargeIds)
      .eq("condominium_id", condominiumId);

    if (chargesError || !realCharges) {
      return { error: "No se pudieron validar los cargos." };
    }

    // Crear mapa de balances reales
    const realBalanceMap = new Map<string, number>();
    realCharges.forEach((c) => realBalanceMap.set(c.id, Number(c.balance || 0)));

    // Validar que todos los cargos existen y son del condominio correcto
    if (realCharges.length !== chargeIds.length) {
      return { error: "Uno o más cargos no existen o no pertenecen a este condominio." };
    }

    // Validar que ningún cargo esté cancelado
    const canceledCharge = realCharges.find((c) => c.status === "cancelado" || c.status === "eliminado");
    if (canceledCharge) {
      return { error: "No puedes asignar pagos a cargos cancelados o eliminados." };
    }

    // Validar que el monto asignado no exceda el balance REAL
    for (const alloc of allocations) {
      const realBalance = realBalanceMap.get(alloc.charge_id) || 0;
      if (alloc.amount_allocated > realBalance + 0.01) {
        return {
          error: `El monto asignado (${alloc.amount_allocated.toFixed(2)}) excede el saldo real del cargo (${realBalance.toFixed(2)}). Recarga la página e intenta de nuevo.`
        };
      }
    }
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

  const paymentId = data as string;

  // Audit log: registrar creación de pago
  logAudit({
    condominiumId,
    tableName: "payments",
    recordId: paymentId,
    action: "CREATE",
    newValues: {
      total_amount: parsedGeneral.total_amount,
      payment_method: parsedGeneral.payment_method,
      unit_id: parsedApply?.unit_id || parsedDirect?.unit_id || null,
      allocations_count: allocations.length,
    },
  });

  revalidatePath(`/app/${condominiumId}/payments`);
  return { success: true, paymentId };
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

  // REGLA 10.5: Verificar si el pago está conciliado (bloqueado)
  // Usar la función SQL is_payment_reconciled si existe, sino hacer consulta directa
  try {
    const { data: isReconciled, error: rpcError } = await supabase.rpc("is_payment_reconciled", {
      in_payment_id: paymentId,
    });

    if (!rpcError && isReconciled === true) {
      return {
        error: "Este ingreso está conciliado y no puede ser anulado. Para anularlo, primero debe eliminar la conciliación bancaria correspondiente."
      };
    }
  } catch {
    // Si la función no existe, hacer consulta directa
    const { data: reconciledItem } = await supabase
      .from("reconciliation_items")
      .select(`id, reconciliation:reconciliations!inner(status)`)
      .eq("payment_id", paymentId)
      .limit(1)
      .maybeSingle();

    if (reconciledItem) {
      const reconciliation = reconciledItem.reconciliation as any;
      const status = Array.isArray(reconciliation) ? reconciliation[0]?.status : reconciliation?.status;

      if (status === "conciliada") {
        return {
          error: "Este ingreso está conciliado y no puede ser anulado. Para anularlo, primero debe eliminar la conciliación bancaria correspondiente."
        };
      }
    }
  }

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
  
  // Audit log: registrar anulación de pago
  logAudit({
    condominiumId,
    tableName: "payments",
    recordId: paymentId,
    action: "ANULACION",
    newValues: { reason: normalizedReason },
    performedBy: cancelledBy,
    notes: `Anulación de ingreso: ${normalizedReason}`,
  });

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

// ============================================================================
// PRONTO PAGO
// ============================================================================

export async function checkEarlyPaymentEligibility(
  condominiumId: string,
  unitId: string,
  chargeIds: string[]
) {
  const supabase = await createClient();

  // Verificar configuración de pronto pago
  const { data: settings } = await supabase
    .from("condominium_billing_settings")
    .select("early_payment_enabled")
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!settings?.early_payment_enabled) {
    return { eligible: false, reason: "Pronto pago no habilitado", discount_amount: 0 };
  }

  // Llamar función RPC
  const { data, error } = await supabase.rpc("check_early_payment_eligibility", {
    p_unit_id: unitId,
    p_charge_ids: chargeIds,
  });

  if (error) {
    console.error("Error verificando elegibilidad de pronto pago", error);
    return { eligible: false, reason: error.message, discount_amount: 0 };
  }

  const result = data?.[0] || { eligible: false, reason: "Error desconocido", discount_amount: 0 };
  return {
    eligible: result.eligible,
    reason: result.reason,
    discount_amount: Number(result.discount_amount || 0),
  };
}

export async function getChargesWithEarlyPaymentInfo(condominiumId: string, unitId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("charges")
    .select(`
      id,
      period,
      description,
      due_date,
      total_amount,
      paid_amount,
      balance,
      charge_type,
      early_payment_eligible,
      early_payment_amount,
      early_payment_deadline,
      early_payment_applied,
      expense_item:expense_items(name)
    `)
    .eq("condominium_id", condominiumId)
    .eq("unit_id", unitId)
    .eq("status", "pendiente")
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error cargando cargos con info de pronto pago", error);
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
    charge_type: c.charge_type,
    early_payment_eligible: c.early_payment_eligible || false,
    early_payment_amount: Number(c.early_payment_amount || 0),
    early_payment_deadline: c.early_payment_deadline,
    early_payment_applied: c.early_payment_applied || false,
  }));
}

// ============================================================================
// CRÉDITOS / SALDOS A FAVOR
// ============================================================================

export async function getUnitCreditBalance(condominiumId: string, unitId: string): Promise<number> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("units")
    .select("credit_balance")
    .eq("id", unitId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  return Number(data?.credit_balance || 0);
}

export async function applyCreditToPayment(
  condominiumId: string,
  unitId: string,
  chargeIds: string[],
  creditAmount: number
) {
  const supabase = await createClient();

  // Verificar saldo disponible
  const currentBalance = await getUnitCreditBalance(condominiumId, unitId);
  if (currentBalance < creditAmount - 0.01) {
    return { error: "Saldo a favor insuficiente" };
  }

  // Obtener cargos
  const { data: charges } = await supabase
    .from("charges")
    .select("id, balance, paid_amount")
    .in("id", chargeIds)
    .eq("condominium_id", condominiumId)
    .eq("unit_id", unitId)
    .eq("status", "pendiente");

  if (!charges?.length) {
    return { error: "No se encontraron los cargos" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let remainingCredit = creditAmount;
  let appliedTotal = 0;

  // Aplicar crédito a cada cargo (FIFO)
  for (const charge of charges) {
    if (remainingCredit <= 0.01) break;

    const applyAmount = Math.min(remainingCredit, charge.balance);
    const newBalance = Math.round((charge.balance - applyAmount) * 100) / 100;
    const newStatus = newBalance <= 0.01 ? "pagado" : "pendiente";

    // Actualizar cargo
    const newPaidAmount = Number(charge.paid_amount || 0) + applyAmount;
    await supabase
      .from("charges")
      .update({
        balance: newBalance,
        paid_amount: newPaidAmount,
        status: newStatus,
      })
      .eq("id", charge.id);

    // Registrar movimiento de crédito
    await supabase.from("unit_credits").insert({
      condominium_id: condominiumId,
      unit_id: unitId,
      movement_type: "credit_out",
      amount: -applyAmount,
      running_balance: 0, // Se calcula en trigger
      charge_id: charge.id,
      description: `Aplicado a cargo pendiente`,
      created_by: user?.id || null,
    });

    remainingCredit -= applyAmount;
    appliedTotal += applyAmount;
  }

  revalidatePath(`/app/${condominiumId}/payments`);
  revalidatePath(`/app/${condominiumId}/charges`);
  revalidatePath(`/app/${condominiumId}/units/${unitId}`);

  return { success: true, applied_amount: appliedTotal };
}

// ============================================================================
// MULTI-UNIDAD: Obtener otras unidades del mismo propietario
// ============================================================================

export async function getOwnerOtherUnits(condominiumId: string, unitId: string) {
  const supabase = await createClient();

  // Primero obtener el propietario principal de la unidad seleccionada
  const { data: primaryContact } = await supabase
    .from("unit_contacts")
    .select("profile_id")
    .eq("unit_id", unitId)
    .eq("is_primary_contact", true)
    .eq("relationship_type", "OWNER")
    .is("end_date", null)
    .maybeSingle();

  if (!primaryContact?.profile_id) {
    return [];
  }

  // Buscar otras unidades donde esta persona es propietario
  const { data: otherUnits } = await supabase
    .from("unit_contacts")
    .select(`
      unit_id,
      unit:units!inner(
        id,
        identifier,
        full_identifier,
        condominium_id,
        status
      )
    `)
    .eq("profile_id", primaryContact.profile_id)
    .eq("relationship_type", "OWNER")
    .eq("is_primary_contact", true)
    .is("end_date", null)
    .neq("unit_id", unitId); // Excluir la unidad actual

  if (!otherUnits?.length) {
    return [];
  }

  // Filtrar por condominio y estado activo
  const filtered = otherUnits
    .filter((uc: any) => {
      const unit = Array.isArray(uc.unit) ? uc.unit[0] : uc.unit;
      return unit?.condominium_id === condominiumId && unit?.status === "activa";
    })
    .map((uc: any) => {
      const unit = Array.isArray(uc.unit) ? uc.unit[0] : uc.unit;
      return {
        id: unit.id,
        identifier: unit.identifier,
        full_identifier: unit.full_identifier,
      };
    });

  return filtered;
}

// Obtener cargos pendientes de múltiples unidades
export async function getPendingChargesMultiUnit(
  condominiumId: string,
  unitIds: string[]
): Promise<(ChargeForPayment & { unit_id: string; unit_identifier: string })[]> {
  if (!unitIds.length) return [];

  const supabase = await createClient();

  // Obtener cargos
  const { data, error } = await supabase
    .from("charges")
    .select(`
      id,
      unit_id,
      period,
      description,
      due_date,
      total_amount,
      paid_amount,
      balance,
      expense_item:expense_items(name),
      unit:units(identifier, full_identifier)
    `)
    .eq("condominium_id", condominiumId)
    .in("unit_id", unitIds)
    .eq("status", "pendiente")
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error cargando cargos multi-unidad", error);
    return [];
  }

  return (data || []).map((c: any) => {
    const unit = Array.isArray(c.unit) ? c.unit[0] : c.unit;
    return {
      id: c.id,
      unit_id: c.unit_id,
      unit_identifier: unit?.full_identifier || unit?.identifier || "—",
      period: c.period,
      expense_item: Array.isArray(c.expense_item) ? c.expense_item[0] : c.expense_item,
      description: c.description,
      due_date: c.due_date,
      total_amount: c.total_amount,
      paid_amount: c.paid_amount,
      balance: c.balance,
    };
  });
}

// ============================================================================
// INGRESOS NO IDENTIFICADOS
// ============================================================================

export type UnidentifiedPayment = {
  id: string;
  condominium_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  bank_reference: string | null;
  financial_account_id: string;
  notes: string | null;
  status: "pendiente" | "asignado" | "devuelto";
  assigned_payment_id: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  created_at: string;
  financial_account?: { bank_name: string; account_number: string } | null;
};

export async function listUnidentifiedPayments(condominiumId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("unidentified_payments")
      .select(`
        *,
        financial_account:financial_accounts(bank_name, account_number)
      `)
      .eq("condominium_id", condominiumId)
      .order("payment_date", { ascending: false });

    if (error) {
      // Si la tabla no existe, retornar vacío
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("Tabla unidentified_payments no existe aún");
        return [];
      }
      // Error de permisos RLS - retornar vacío silenciosamente
      if (error.code === "PGRST301" || error.message?.includes("permission")) {
        console.warn("Sin permisos para ver pagos no identificados");
        return [];
      }
      console.error("Error listando pagos no identificados:", error.message || error.code || "Error desconocido");
      return [];
    }

    return (data || []).map((p: any) => ({
      ...p,
      financial_account: Array.isArray(p.financial_account)
        ? p.financial_account[0]
        : p.financial_account,
    })) as UnidentifiedPayment[];
  } catch (err) {
    // Capturar errores de red u otros
    console.error("Error inesperado listando pagos no identificados:", err);
    return [];
  }
}

export async function createUnidentifiedPayment(
  condominiumId: string,
  data: {
    payment_date: string;
    amount: number;
    payment_method: string;
    reference_number?: string;
    bank_reference?: string;
    financial_account_id: string;
    notes?: string;
  }
) {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from("unidentified_payments")
    .insert({
      condominium_id: condominiumId,
      payment_date: data.payment_date,
      amount: data.amount,
      payment_method: data.payment_method,
      reference_number: data.reference_number || null,
      bank_reference: data.bank_reference || null,
      financial_account_id: data.financial_account_id,
      notes: data.notes || null,
      status: "pendiente",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creando pago no identificado", error);
    return { error: error.message || "No se pudo registrar el pago no identificado" };
  }

  revalidatePath(`/app/${condominiumId}/payments`);
  return { success: true, id: result.id };
}

export async function assignUnidentifiedPayment(
  condominiumId: string,
  unidentifiedPaymentId: string,
  unitId: string,
  allocations: Array<{ charge_id: string; amount_allocated: number; charge_balance: number }>
) {
  const supabase = await createClient();

  // Obtener el pago no identificado
  const { data: unidentified, error: fetchError } = await supabase
    .from("unidentified_payments")
    .select("*")
    .eq("id", unidentifiedPaymentId)
    .eq("condominium_id", condominiumId)
    .eq("status", "pendiente")
    .single();

  if (fetchError || !unidentified) {
    return { error: "Pago no identificado no encontrado o ya asignado" };
  }

  // Crear el pago real usando la función existente
  const paymentResult = await createPayment(condominiumId, {
    general: {
      condominium_id: condominiumId,
      financial_account_id: unidentified.financial_account_id,
      payment_date: unidentified.payment_date,
      total_amount: unidentified.amount,
      payment_method: unidentified.payment_method,
      reference_number: unidentified.reference_number || unidentified.bank_reference || "",
      notes: `Asignado desde pago no identificado. ${unidentified.notes || ""}`.trim(),
    },
    apply: {
      unit_id: unitId,
      allocations,
      allow_unassigned: true,
    },
    direct: null,
  });

  if ("error" in paymentResult && paymentResult.error) {
    return { error: paymentResult.error };
  }

  const paymentId = (paymentResult as { paymentId?: string }).paymentId;

  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser();

  // Marcar como asignado
  const { error: updateError } = await supabase
    .from("unidentified_payments")
    .update({
      status: "asignado",
      assigned_payment_id: paymentId,
      assigned_at: new Date().toISOString(),
      assigned_by: user?.id || null,
    })
    .eq("id", unidentifiedPaymentId)
    .eq("condominium_id", condominiumId);

  if (updateError) {
    console.error("Error actualizando pago no identificado", updateError);
    // El pago ya se creó, solo falló la actualización del estado
  }

  revalidatePath(`/app/${condominiumId}/payments`);
  return { success: true, paymentId };
}

export async function markUnidentifiedAsReturned(
  condominiumId: string,
  unidentifiedPaymentId: string,
  reason: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("unidentified_payments")
    .update({
      status: "devuelto",
      notes: reason,
    })
    .eq("id", unidentifiedPaymentId)
    .eq("condominium_id", condominiumId)
    .eq("status", "pendiente");

  if (error) {
    console.error("Error marcando pago como devuelto", error);
    return { error: "No se pudo marcar como devuelto" };
  }

  revalidatePath(`/app/${condominiumId}/payments`);
  return { success: true };
}
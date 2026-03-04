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
import { isEffectivelyZero, toCents } from "@/lib/utils/money";

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
    query = query.neq("status", "cancelado").neq("status", "anulado");
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

  const unitIds = payments.map((p) => p.unit_id).filter(Boolean) as string[];
  const accountIds = payments.map((p) => p.financial_account_id).filter(Boolean) as string[];
  const expenseIds = payments.map((p) => p.expense_item_id).filter(Boolean) as string[];

  // Registros SIN snapshot (pre-migración) necesitan fallback dinámico
  const needsFallbackUnitIds = payments
    .filter((p) => !p.billing_name && p.unit_id)
    .map((p) => p.unit_id) as string[];
  const needsFallbackPayerIds = payments
    .filter((p) => !p.billing_name && p.payer_profile_id)
    .map((p) => p.payer_profile_id) as string[];

  const [unitsRes, accountsRes, expensesRes, fallbackContactsRes, fallbackPayersRes] = await Promise.all([
    unitIds.length
      ? supabase.from("units").select("id, full_identifier, identifier").in("id", unitIds)
      : Promise.resolve({ data: [] as any[] }),
    accountIds.length
      ? supabase.from("financial_accounts").select("id, bank_name, account_number").in("id", accountIds)
      : Promise.resolve({ data: [] as any[] }),
    expenseIds.length
      ? supabase.from("expense_items").select("id, name").in("id", expenseIds)
      : Promise.resolve({ data: [] as any[] }),
    // Fallback dinámico SOLO para registros viejos sin snapshot
    needsFallbackUnitIds.length
      ? supabase
          .from("unit_contacts")
          .select("unit_id, profiles(id, full_name)")
          .in("unit_id", needsFallbackUnitIds)
          .eq("is_primary_contact", true)
          .is("end_date", null)
      : Promise.resolve({ data: [] as any[] }),
    needsFallbackPayerIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", needsFallbackPayerIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const unitsMap = new Map<string, any>();
  const accountsMap = new Map<string, any>();
  const expensesMap = new Map<string, any>();
  const fallbackContactMap = new Map<string, string>();
  const fallbackPayerMap = new Map<string, string>();

  (unitsRes.data || []).forEach((u) => unitsMap.set(u.id, u));
  (accountsRes.data || []).forEach((a) => accountsMap.set(a.id, a));
  (expensesRes.data || []).forEach((e) => expensesMap.set(e.id, e));
  (fallbackContactsRes.data || []).forEach((c: any) => {
    const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
    if (c.unit_id && profile?.full_name) fallbackContactMap.set(c.unit_id, profile.full_name);
  });
  (fallbackPayersRes.data || []).forEach((p: any) => {
    if (p.id && p.full_name) fallbackPayerMap.set(p.id, p.full_name);
  });

  return payments.map((p) => {
    // PRIORIDAD: 1) Snapshot inmutable → 2) Fallback dinámico (solo registros viejos)
    const payerName =
      p.billing_name ||
      fallbackPayerMap.get(p.payer_profile_id) ||
      fallbackContactMap.get(p.unit_id) ||
      "-";

    return {
      ...p,
      unit: unitsMap.get(p.unit_id) || null,
      financial_account: accountsMap.get(p.financial_account_id) || null,
      expense_item: expensesMap.get(p.expense_item_id) || null,
      attachment_url: (p as any).attachment_url ?? null,
      payer: { full_name: payerName },
    };
  });
}

export async function listarPaymentsAnulados(condominiumId: string) {
  return listarPayments(condominiumId, { status: "cancelado" });
}

export async function getPaymentDetail(condominiumId: string, paymentId: string) {
  const supabase = await createClient();

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

  const [unitRes, accountRes, allocationsRes] = await Promise.all([
    payment.unit_id
      ? supabase.from("units").select("id, full_identifier, identifier").eq("id", payment.unit_id).single()
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
  ]);

  const allocations = (allocationsRes.data || []).map((a: any) => ({
    id: a.id,
    amount_allocated: a.amount_allocated,
    charge: Array.isArray(a.charge) ? a.charge[0] : a.charge,
  }));

  // ── Fallback dinámico para registros pre-migración sin snapshot ──
  let payerData = {
    full_name: payment.billing_name || "-",
    national_id: payment.billing_national_id || null,
    email: payment.billing_email || null,
    phone: payment.billing_phone || null,
    address: payment.billing_address || null,
  };

  if (!payment.billing_name) {
    // Prioridad 1: payer_profile_id → profiles
    if (payment.payer_profile_id) {
      const { data: fallbackPayer } = await supabase
        .from("profiles")
        .select("full_name, national_id, email, phone, address")
        .eq("id", payment.payer_profile_id)
        .maybeSingle();
      if (fallbackPayer?.full_name) {
        payerData = {
          full_name: fallbackPayer.full_name,
          national_id: fallbackPayer.national_id || null,
          email: fallbackPayer.email || null,
          phone: fallbackPayer.phone || null,
          address: fallbackPayer.address || null,
        };
      }
    }
    // Prioridad 2: unit_contacts → profiles (contacto primario actual)
    if (payerData.full_name === "-" && payment.unit_id) {
      const { data: fallbackContact } = await supabase
        .from("unit_contacts")
        .select("profiles(full_name, national_id, email, phone, address)")
        .eq("unit_id", payment.unit_id)
        .eq("is_primary_contact", true)
        .is("end_date", null)
        .maybeSingle();
      const profile = Array.isArray((fallbackContact as any)?.profiles)
        ? (fallbackContact as any).profiles[0]
        : (fallbackContact as any)?.profiles;
      if (profile?.full_name) {
        payerData = {
          full_name: profile.full_name,
          national_id: profile.national_id || null,
          email: profile.email || null,
          phone: profile.phone || null,
          address: profile.address || null,
        };
      }
    }
  }

  return {
    ...payment,
    unit: unitRes.data || null,
    financial_account: accountRes.data || null,
    allocations,
    payer: payerData,
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

    const realBalanceMap = new Map<string, number>();
    realCharges.forEach((c) => realBalanceMap.set(c.id, Number(c.balance || 0)));

    if (realCharges.length !== chargeIds.length) {
      return { error: "Uno o más cargos no existen o no pertenecen a este condominio." };
    }

    const canceledCharge = realCharges.find((c) => c.status === "cancelado" || c.status === "eliminado");
    if (canceledCharge) {
      return { error: "No puedes asignar pagos a cargos cancelados o eliminados." };
    }

    for (const alloc of allocations) {
      const realBalance = realBalanceMap.get(alloc.charge_id) || 0;
      if (toCents(alloc.amount_allocated) > toCents(realBalance)) {
        return {
          error: `El monto asignado (${alloc.amount_allocated.toFixed(2)}) excede el saldo real del cargo (${realBalance.toFixed(2)}). Recarga la página e intenta de nuevo.`
        };
      }
    }
  }

  const unitId = parsedApply?.unit_id || parsedDirect?.unit_id || null;
  let billingSnapshot = {
    name: "-" as string,
    national_id: null as string | null,
    email: null as string | null,
    phone: null as string | null,
    address: null as string | null,
    contact_type: null as string | null,
  };

  if (unitId) {
    // Resolver billing contact: query unit_contacts + profiles con jerarquía
    const { data: contacts } = await supabase
      .from("unit_contacts")
      .select("id, relationship_type, is_primary_contact, end_date, profiles(full_name, first_name, last_name, national_id, email, phone, address)")
      .eq("unit_id", unitId)
      .is("end_date", null);

    if (contacts && contacts.length > 0) {
      // Jerarquía: 1) primary_contact, 2) TENANT, 3) OWNER, 4) DEVELOPER, 5) primero
      const selected =
        contacts.find((c: any) => c.is_primary_contact) ||
        contacts.find((c: any) => c.relationship_type === "TENANT") ||
        contacts.find((c: any) => c.relationship_type === "OWNER") ||
        contacts.find((c: any) => c.relationship_type === "DEVELOPER") ||
        contacts[0];

      const profile = Array.isArray((selected as any).profiles)
        ? (selected as any).profiles[0]
        : (selected as any).profiles;

      if (profile) {
        billingSnapshot.name = profile.full_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "-";
        billingSnapshot.national_id = profile.national_id || null;
        billingSnapshot.email = profile.email || null;
        billingSnapshot.phone = profile.phone || null;
        billingSnapshot.address = profile.address || null;
        billingSnapshot.contact_type = (selected as any).relationship_type || null;
      }
    }
  } else if (parsedGeneral.payer_profile_id) {
    const { data: payerProfile } = await supabase
      .from("profiles")
      .select("full_name, first_name, last_name, national_id, email, phone, address")
      .eq("id", parsedGeneral.payer_profile_id)
      .maybeSingle();

    if (payerProfile) {
      billingSnapshot.name = payerProfile.full_name || `${payerProfile.first_name || ''} ${payerProfile.last_name || ''}`.trim() || "-";
      billingSnapshot.national_id = payerProfile.national_id || null;
      billingSnapshot.email = payerProfile.email || null;
      billingSnapshot.phone = payerProfile.phone || null;
      billingSnapshot.address = payerProfile.address || null;
    }
  }

  const { data, error } = await supabase.rpc("apply_payment_to_charges", {
    in_condominium_id: condominiumId,
    in_financial_account_id: parsedGeneral.financial_account_id,
    in_payment_date: parsedGeneral.payment_date,
    in_total_amount: parsedGeneral.total_amount,
    in_payment_method: parsedGeneral.payment_method,
    in_reference_number: parsedGeneral.reference_number || null,
    in_notes: parsedGeneral.notes || null,
    in_payer_profile_id: parsedGeneral.payer_profile_id || null,
    in_unit_id: unitId,
    in_expense_item_id: parsedDirect?.expense_item_id || parsedApply?.expense_item_id_for_remainder || null,
    in_allocations: allocations.map((a) => ({
      charge_id: a.charge_id,
      amount_allocated: a.amount_allocated,
    })),
    in_folio_rec: (parsedGeneral as any).folio_rec || null,
    in_billing_name: billingSnapshot.name,
    in_billing_national_id: billingSnapshot.national_id,
    in_billing_email: billingSnapshot.email,
    in_billing_phone: billingSnapshot.phone,
    in_billing_address: billingSnapshot.address,
    in_billing_contact_type: billingSnapshot.contact_type,
  });

  if (error) {
    console.error("Error creando payment:", error);
    return { error: error.message || "No se pudo crear el ingreso." };
  }

  const paymentId = data as string;

  logAudit({
    condominiumId,
    tableName: "payments",
    recordId: paymentId,
    action: "CREATE",
    newValues: {
      total_amount: parsedGeneral.total_amount,
      payment_method: parsedGeneral.payment_method,
      unit_id: unitId,
      allocations_count: allocations.length,
      billing_name: billingSnapshot.name
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
  
  const { data, error } = await supabase.rpc('anular_payment', {
    p_payment_id: paymentId,
    p_cancelled_by_profile_id: cancelledBy,
    p_cancellation_reason: normalizedReason
  });
  
  if (error) {
    console.error("Error anulando payment", error);
    return { error: error.message || "No se pudo anular el ingreso." };
  }
  
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

export async function checkEarlyPaymentEligibility(
  condominiumId: string,
  unitId: string,
  chargeIds: string[]
) {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("condominium_billing_settings")
    .select("early_payment_enabled")
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!settings?.early_payment_enabled) {
    return { eligible: false, reason: "Pronto pago no habilitado", discount_amount: 0 };
  }

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

  const currentBalance = await getUnitCreditBalance(condominiumId, unitId);
  if (toCents(currentBalance) < toCents(creditAmount)) {
    return { error: "Saldo a favor insuficiente" };
  }

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

  for (const charge of charges) {
    if (isEffectivelyZero(remainingCredit)) break;

    const applyAmount = Math.min(remainingCredit, charge.balance);
    const newBalance = Math.round((charge.balance - applyAmount) * 100) / 100;
    const newStatus = isEffectivelyZero(newBalance) ? "pagado" : "pendiente";

    const newPaidAmount = Number(charge.paid_amount || 0) + applyAmount;
    await supabase
      .from("charges")
      .update({
        balance: newBalance,
        paid_amount: newPaidAmount,
        status: newStatus,
      })
      .eq("id", charge.id);

    await supabase.from("unit_credits").insert({
      condominium_id: condominiumId,
      unit_id: unitId,
      movement_type: "credit_out",
      amount: -applyAmount,
      running_balance: 0,
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

export async function getOwnerOtherUnits(condominiumId: string, unitId: string) {
  const supabase = await createClient();

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
    .neq("unit_id", unitId); 

  if (!otherUnits?.length) {
    return [];
  }

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

export async function getPendingChargesMultiUnit(
  condominiumId: string,
  unitIds: string[]
): Promise<(ChargeForPayment & { unit_id: string; unit_identifier: string })[]> {
  if (!unitIds.length) return [];

  const supabase = await createClient();

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
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("Tabla unidentified_payments no existe aún");
        return [];
      }
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

  const { data: { user } } = await supabase.auth.getUser();

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
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  PaymentAgreement,
  PaymentAgreementCharge,
  PaymentAgreementInstallment,
  PaymentAgreementFormData,
} from "@/types/billing";

const AgreementSchema = z.object({
  unit_id: z.string().uuid("Selecciona una unidad"),
  charge_ids: z.array(z.string().uuid()).min(1, "Selecciona al menos un cargo"),
  down_payment: z.coerce.number().min(0).default(0),
  installments: z.coerce.number().int().min(1).max(60, "Máximo 60 cuotas"),
  start_date: z.string().min(1, "Selecciona la fecha de inicio"),
  freeze_late_fees: z.boolean().default(true),
  notes: z.string().optional(),
});

export async function getPaymentAgreements(
  condominiumId: string,
  filters?: { status?: string; unit_id?: string }
): Promise<PaymentAgreement[]> {
  const supabase = await createClient();

  let query = supabase
    .from("payment_agreements")
    .select(`*, unit:units(identifier, full_identifier)`)
    .eq("condominium_id", condominiumId)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "todos") {
    query = query.eq("status", filters.status);
  }

  if (filters?.unit_id) {
    query = query.eq("unit_id", filters.unit_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listando convenios", error);
    return [];
  }

  return data || [];
}

export async function getPaymentAgreementDetail(
  condominiumId: string,
  agreementId: string
): Promise<{
  agreement: PaymentAgreement;
  charges: PaymentAgreementCharge[];
  installments: PaymentAgreementInstallment[];
} | null> {
  const supabase = await createClient();

  const [agreementRes, chargesRes, installmentsRes] = await Promise.all([
    supabase
      .from("payment_agreements")
      .select(`*, unit:units(identifier, full_identifier)`)
      .eq("id", agreementId)
      .eq("condominium_id", condominiumId)
      .maybeSingle(),
    supabase
      .from("payment_agreement_charges")
      .select(
        `*, charge:charges(id, description, total_amount, balance, due_date, charge_type)`
      )
      .eq("payment_agreement_id", agreementId),
    supabase
      .from("payment_agreement_installments")
      .select(`*, charge:charges(id, status, paid_amount, balance)`)
      .eq("payment_agreement_id", agreementId)
      .order("installment_number"),
  ]);

  if (agreementRes.error || !agreementRes.data) {
    console.error("Error obteniendo convenio", agreementRes.error);
    return null;
  }

  return {
    agreement: agreementRes.data,
    charges: chargesRes.data || [],
    installments: installmentsRes.data || [],
  };
}

export async function getUnitPendingCharges(condominiumId: string, unitId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("charges")
    .select("id, description, total_amount, balance, due_date, charge_type, expense_items(name)")
    .eq("condominium_id", condominiumId)
    .eq("unit_id", unitId)
    .eq("status", "pendiente")
    .gt("balance", 0.01)
    .order("due_date");

  if (error) {
    console.error("Error obteniendo cargos pendientes", error);
    return [];
  }

  // Transformar expense_items de array/objeto a objeto simple
  return (data || []).map((charge) => ({
    ...charge,
    expense_item: charge.expense_items
      ? Array.isArray(charge.expense_items)
        ? charge.expense_items[0] || null
        : charge.expense_items
      : null,
  }));
}

export async function checkUnitHasActiveAgreement(
  condominiumId: string,
  unitId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("payment_agreements")
    .select("id")
    .eq("condominium_id", condominiumId)
    .eq("unit_id", unitId)
    .eq("status", "activo")
    .maybeSingle();

  return !!data;
}

export async function createPaymentAgreement(
  condominiumId: string,
  formData: PaymentAgreementFormData
) {
  const parsed = AgreementSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const supabase = await createClient();

  // Verificar que no tenga convenio activo
  const hasActive = await checkUnitHasActiveAgreement(condominiumId, data.unit_id);
  if (hasActive) {
    return { error: "La unidad ya tiene un convenio de pago activo" };
  }

  // Obtener los cargos seleccionados
  const { data: charges, error: chargesError } = await supabase
    .from("charges")
    .select("id, balance, total_amount")
    .in("id", data.charge_ids)
    .eq("condominium_id", condominiumId)
    .eq("status", "pendiente");

  if (chargesError || !charges?.length) {
    return { error: "No se encontraron los cargos seleccionados" };
  }

  // Calcular totales
  const originalDebt = charges.reduce((sum, c) => sum + Number(c.balance), 0);
  const totalAmount = originalDebt; // Puede ajustarse si hay descuento/recargo
  const remainingAfterDown = totalAmount - data.down_payment;

  if (remainingAfterDown <= 0) {
    return { error: "El pago inicial cubre toda la deuda. No es necesario un convenio." };
  }

  const installmentAmount = Math.round((remainingAfterDown / data.installments) * 100) / 100;

  // Calcular fecha fin
  const startDate = new Date(data.start_date);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + data.installments - 1);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Crear convenio
  const { data: agreement, error: agreementError } = await supabase
    .from("payment_agreements")
    .insert({
      condominium_id: condominiumId,
      unit_id: data.unit_id,
      original_debt_amount: originalDebt,
      total_amount: totalAmount,
      down_payment: data.down_payment,
      remaining_amount: remainingAfterDown,
      installments: data.installments,
      installment_amount: installmentAmount,
      start_date: data.start_date,
      end_date: endDate.toISOString().split("T")[0],
      status: "activo",
      freeze_late_fees: data.freeze_late_fees,
      notes: data.notes || null,
      created_by: user?.id || null,
      approved_at: new Date().toISOString(),
      approved_by: user?.id || null,
    })
    .select("id")
    .single();

  if (agreementError || !agreement) {
    console.error("Error creando convenio", agreementError);
    return { error: "No se pudo crear el convenio" };
  }

  // Guardar cargos incluidos
  const chargeRows = charges.map((c) => ({
    payment_agreement_id: agreement.id,
    charge_id: c.id,
    original_balance: c.balance,
  }));

  await supabase.from("payment_agreement_charges").insert(chargeRows);

  // Generar cuotas del convenio (como cargos nuevos)
  const { data: expenseItem } = await supabase
    .from("expense_items")
    .select("id")
    .eq("condominium_id", condominiumId)
    .ilike("name", "%convenio%")
    .maybeSingle();

  let expenseItemId = expenseItem?.id;
  if (!expenseItemId) {
    // Crear rubro para convenios
    const { data: newItem } = await supabase
      .from("expense_items")
      .insert({
        condominium_id: condominiumId,
        name: "Cuota Convenio de Pago",
        category: "ingreso",
        classification: "extraordinario",
        allocation_method: "por_unidad",
        is_active: true,
      })
      .select("id")
      .single();
    expenseItemId = newItem?.id;
  }

  const installmentCharges: Array<{
    condominium_id: string;
    unit_id: string;
    expense_item_id: string;
    charge_type: string;
    posted_date: string;
    due_date: string;
    total_amount: number;
    balance: number;
    status: string;
    description: string;
    late_fee_eligible: boolean;
  }> = [];

  const installmentRows: Array<{
    payment_agreement_id: string;
    installment_number: number;
    due_date: string;
    amount: number;
    status: string;
  }> = [];

  for (let i = 1; i <= data.installments; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));
    const dueDateStr = dueDate.toISOString().split("T")[0];

    // Ajustar última cuota para cubrir diferencias de redondeo
    const amount =
      i === data.installments
        ? remainingAfterDown - installmentAmount * (data.installments - 1)
        : installmentAmount;

    installmentCharges.push({
      condominium_id: condominiumId,
      unit_id: data.unit_id,
      expense_item_id: expenseItemId!,
      charge_type: "otro",
      posted_date: new Date().toISOString().split("T")[0],
      due_date: dueDateStr,
      total_amount: Math.round(amount * 100) / 100,
      balance: Math.round(amount * 100) / 100,
      status: "pendiente",
      description: `Convenio de Pago - Cuota ${i}/${data.installments}`,
      late_fee_eligible: !data.freeze_late_fees,
    });

    installmentRows.push({
      payment_agreement_id: agreement.id,
      installment_number: i,
      due_date: dueDateStr,
      amount: Math.round(amount * 100) / 100,
      status: "pendiente",
    });
  }

  // Insertar cargos de cuotas
  const { data: createdCharges, error: chargeInsertError } = await supabase
    .from("charges")
    .insert(installmentCharges)
    .select("id");

  if (chargeInsertError) {
    console.error("Error creando cargos de cuotas", chargeInsertError);
    // No fallar, el convenio ya se creó
  }

  // Vincular cargos con cuotas del convenio
  if (createdCharges) {
    for (let i = 0; i < installmentRows.length; i++) {
      installmentRows[i] = {
        ...installmentRows[i],
        // @ts-ignore - agregar charge_id
        charge_id: createdCharges[i]?.id || null,
      };
    }
  }

  await supabase.from("payment_agreement_installments").insert(installmentRows);

  // Si los cargos originales deben congelarse (no generar más mora), marcarlos
  if (data.freeze_late_fees) {
    await supabase
      .from("charges")
      .update({
        late_fee_eligible: false,
        late_fee_exemption_reason: `Incluido en convenio de pago ${agreement.id}`,
      })
      .in("id", data.charge_ids)
      .eq("condominium_id", condominiumId);
  }

  revalidatePath(`/app/${condominiumId}/payment-agreements`);
  revalidatePath(`/app/${condominiumId}/charges`);
  revalidatePath(`/app/${condominiumId}/units/${data.unit_id}`);

  return {
    success: true,
    agreementId: agreement.id,
    installments_created: data.installments,
  };
}

export async function cancelPaymentAgreement(
  condominiumId: string,
  agreementId: string,
  reason: string
) {
  const supabase = await createClient();

  // Verificar que el convenio existe y está activo
  const { data: agreement } = await supabase
    .from("payment_agreements")
    .select("status, unit_id")
    .eq("id", agreementId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!agreement) {
    return { error: "Convenio no encontrado" };
  }

  if (agreement.status !== "activo") {
    return { error: "Solo se pueden cancelar convenios activos" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Obtener cuotas pendientes para cancelarlas
  const { data: installments } = await supabase
    .from("payment_agreement_installments")
    .select("charge_id")
    .eq("payment_agreement_id", agreementId)
    .eq("status", "pendiente");

  const chargeIds = (installments || []).map((i) => i.charge_id).filter(Boolean);

  // Cancelar cargos de cuotas pendientes
  if (chargeIds.length > 0) {
    await supabase
      .from("charges")
      .update({
        status: "cancelado",
        cancellation_reason: `Convenio cancelado: ${reason}`,
        cancelled_at: new Date().toISOString(),
        cancelled_by_profile_id: user?.id || null,
      })
      .in("id", chargeIds)
      .eq("condominium_id", condominiumId);
  }

  // Restaurar elegibilidad de mora en cargos originales
  const { data: originalCharges } = await supabase
    .from("payment_agreement_charges")
    .select("charge_id")
    .eq("payment_agreement_id", agreementId);

  if (originalCharges?.length) {
    const originalIds = originalCharges.map((c) => c.charge_id);
    await supabase
      .from("charges")
      .update({
        late_fee_eligible: true,
        late_fee_exemption_reason: null,
      })
      .in("id", originalIds)
      .eq("condominium_id", condominiumId);
  }

  // Cancelar convenio
  const { error } = await supabase
    .from("payment_agreements")
    .update({
      status: "cancelado",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user?.id || null,
      cancellation_reason: reason,
    })
    .eq("id", agreementId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("Error cancelando convenio", error);
    return { error: "No se pudo cancelar el convenio" };
  }

  revalidatePath(`/app/${condominiumId}/payment-agreements`);
  revalidatePath(`/app/${condominiumId}/charges`);
  revalidatePath(`/app/${condominiumId}/units/${agreement.unit_id}`);

  return {
    success: true,
    installments_cancelled: chargeIds.length,
  };
}

export async function markAgreementAsCompleted(condominiumId: string, agreementId: string) {
  const supabase = await createClient();

  // Verificar que todas las cuotas están pagadas
  const { data: pendingInstallments } = await supabase
    .from("payment_agreement_installments")
    .select("id")
    .eq("payment_agreement_id", agreementId)
    .neq("status", "pagado");

  if (pendingInstallments && pendingInstallments.length > 0) {
    return { error: "Aún hay cuotas pendientes de pago" };
  }

  const { error } = await supabase
    .from("payment_agreements")
    .update({
      status: "completado",
      completed_at: new Date().toISOString(),
    })
    .eq("id", agreementId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("Error completando convenio", error);
    return { error: "No se pudo marcar como completado" };
  }

  revalidatePath(`/app/${condominiumId}/payment-agreements`);
  return { success: true };
}

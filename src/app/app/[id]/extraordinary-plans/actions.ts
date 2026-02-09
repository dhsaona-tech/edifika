"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  ExtraordinaryPlan,
  ExtraordinaryPlanUnit,
  ExtraordinaryPlanFormData,
} from "@/types/billing";

const PlanSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  expense_item_id: z.string().uuid("Selecciona un rubro"),
  distribution_method: z.enum(["por_aliquota", "igualitario", "manual"]),
  total_amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  total_installments: z.coerce.number().int().min(1).max(60, "Maximo 60 cuotas"),
  start_period: z.string().min(1, "Selecciona el periodo de inicio"),
  unit_amounts: z
    .array(
      z.object({
        unit_id: z.string().uuid(),
        total_amount: z.coerce.number().min(0),
      })
    )
    .optional(),
});

export async function getExtraordinaryPlans(
  condominiumId: string,
  filters?: { status?: string }
): Promise<ExtraordinaryPlan[]> {
  const supabase = await createClient();

  let query = supabase
    .from("extraordinary_plans")
    .select(`*, expense_item:expense_items(name)`)
    .eq("condominium_id", condominiumId)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "todos") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listando planes extraordinarios", error);
    return [];
  }

  return data || [];
}

export async function getExtraordinaryPlanDetail(
  condominiumId: string,
  planId: string
): Promise<{ plan: ExtraordinaryPlan; units: ExtraordinaryPlanUnit[] } | null> {
  const supabase = await createClient();

  const [planRes, unitsRes] = await Promise.all([
    supabase
      .from("extraordinary_plans")
      .select(`*, expense_item:expense_items(name)`)
      .eq("id", planId)
      .eq("condominium_id", condominiumId)
      .maybeSingle(),
    supabase
      .from("extraordinary_plan_units")
      .select(`*, unit:units(identifier, full_identifier)`)
      .eq("extraordinary_plan_id", planId),
  ]);

  if (planRes.error || !planRes.data) {
    console.error("Error obteniendo plan", planRes.error);
    return null;
  }

  return {
    plan: planRes.data,
    units: unitsRes.data || [],
  };
}

export async function createExtraordinaryPlan(
  condominiumId: string,
  formData: ExtraordinaryPlanFormData
) {
  const parsed = PlanSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const supabase = await createClient();

  // Obtener usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Crear plan maestro
  const { data: plan, error: planError } = await supabase
    .from("extraordinary_plans")
    .insert({
      condominium_id: condominiumId,
      name: data.name,
      description: data.description || null,
      expense_item_id: data.expense_item_id,
      distribution_method: data.distribution_method,
      total_amount: data.total_amount,
      total_installments: data.total_installments,
      start_period: data.start_period,
      status: "borrador",
      created_by: user?.id || null,
    })
    .select("id")
    .single();

  if (planError || !plan) {
    console.error("Error creando plan", planError);
    return { error: "No se pudo crear el plan extraordinario" };
  }

  // Si es distribucion manual, guardar montos por unidad
  if (data.distribution_method === "manual" && data.unit_amounts?.length) {
    const unitRows = data.unit_amounts
      .filter((u) => u.total_amount > 0)
      .map((u) => ({
        extraordinary_plan_id: plan.id,
        unit_id: u.unit_id,
        total_amount: u.total_amount,
        installment_amount: u.total_amount / data.total_installments,
      }));

    if (unitRows.length > 0) {
      const { error: unitsError } = await supabase
        .from("extraordinary_plan_units")
        .insert(unitRows);

      if (unitsError) {
        console.error("Error guardando unidades del plan", unitsError);
        // No fallar, el plan ya se creo
      }
    }
  }

  revalidatePath(`/app/${condominiumId}/extraordinary-plans`);
  return { success: true, planId: plan.id };
}

export async function approveExtraordinaryPlan(condominiumId: string, planId: string) {
  const supabase = await createClient();

  // Verificar que el plan existe y esta en borrador
  const { data: plan, error: planError } = await supabase
    .from("extraordinary_plans")
    .select("*")
    .eq("id", planId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (planError || !plan) {
    return { error: "Plan no encontrado" };
  }

  if (plan.status !== "borrador") {
    return { error: "Solo se pueden aprobar planes en borrador" };
  }

  // Obtener unidades para distribuir
  const { data: units } = await supabase
    .from("units")
    .select("id, identifier, full_identifier, aliquot")
    .eq("condominium_id", condominiumId)
    .eq("status", "activa");

  if (!units || units.length === 0) {
    return { error: "No hay unidades activas en el condominio" };
  }

  // Calcular distribucion
  let distribution: Array<{ unit_id: string; total_amount: number; installment_amount: number }> =
    [];

  if (plan.distribution_method === "manual") {
    // Usar montos guardados
    const { data: planUnits } = await supabase
      .from("extraordinary_plan_units")
      .select("unit_id, total_amount, installment_amount")
      .eq("extraordinary_plan_id", planId);

    distribution = planUnits || [];
  } else if (plan.distribution_method === "igualitario") {
    const perUnit = plan.total_amount / units.length;
    const installmentPerUnit = perUnit / plan.total_installments;
    distribution = units.map((u) => ({
      unit_id: u.id,
      total_amount: perUnit,
      installment_amount: installmentPerUnit,
    }));
  } else {
    // por_aliquota
    const totalAliquot = units.reduce((sum, u) => sum + Number(u.aliquot || 0), 0) || 1;
    distribution = units.map((u) => {
      const share = Number(u.aliquot || 0) / totalAliquot;
      const total = plan.total_amount * share;
      return {
        unit_id: u.id,
        total_amount: total,
        installment_amount: total / plan.total_installments,
      };
    });
  }

  // Generar cargos para cada cuota y cada unidad
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const charges: Array<{
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
    extraordinary_plan_id: string;
    installment_number: number;
    total_installments: number;
    late_fee_eligible: boolean;
  }> = [];

  const startDate = new Date(plan.start_period);

  for (let cuota = 1; cuota <= plan.total_installments; cuota++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + (cuota - 1));
    const dueDateStr = dueDate.toISOString().split("T")[0];

    for (const dist of distribution) {
      if (dist.installment_amount <= 0) continue;

      charges.push({
        condominium_id: condominiumId,
        unit_id: dist.unit_id,
        expense_item_id: plan.expense_item_id,
        charge_type: "extraordinary_installment",
        posted_date: new Date().toISOString().split("T")[0],
        due_date: dueDateStr,
        total_amount: Math.round(dist.installment_amount * 100) / 100,
        balance: Math.round(dist.installment_amount * 100) / 100,
        status: "pendiente",
        description: `${plan.name} - Cuota ${cuota}/${plan.total_installments}`,
        extraordinary_plan_id: planId,
        installment_number: cuota,
        total_installments: plan.total_installments,
        late_fee_eligible: true,
      });
    }
  }

  // Insertar cargos en lotes
  const batchSize = 100;
  for (let i = 0; i < charges.length; i += batchSize) {
    const batch = charges.slice(i, i + batchSize);
    const { error: chargeError } = await supabase.from("charges").insert(batch);
    if (chargeError) {
      console.error("Error insertando cargos", chargeError);
      return { error: "Error al generar los cargos" };
    }
  }

  // Actualizar estado del plan
  const { error: updateError } = await supabase
    .from("extraordinary_plans")
    .update({
      status: "activo",
      approved_at: new Date().toISOString(),
      approved_by: user?.id || null,
    })
    .eq("id", planId)
    .eq("condominium_id", condominiumId);

  if (updateError) {
    console.error("Error actualizando plan", updateError);
    return { error: "Cargos generados pero no se pudo actualizar el estado del plan" };
  }

  revalidatePath(`/app/${condominiumId}/extraordinary-plans`);
  revalidatePath(`/app/${condominiumId}/charges`);

  return {
    success: true,
    charges_created: charges.length,
  };
}

export async function cancelExtraordinaryPlan(
  condominiumId: string,
  planId: string,
  reason: string
) {
  const supabase = await createClient();

  // Verificar que el plan existe
  const { data: plan } = await supabase
    .from("extraordinary_plans")
    .select("status")
    .eq("id", planId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!plan) {
    return { error: "Plan no encontrado" };
  }

  if (plan.status === "cancelado") {
    return { error: "El plan ya esta cancelado" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Cancelar cargos pendientes asociados (soft-delete)
  const { data: chargesCancelados } = await supabase
    .from("charges")
    .update({
      status: "cancelado",
      cancellation_reason: `Plan extraordinario cancelado: ${reason}`,
      cancelled_at: new Date().toISOString(),
      cancelled_by_profile_id: user?.id || null,
    })
    .eq("extraordinary_plan_id", planId)
    .eq("condominium_id", condominiumId)
    .eq("status", "pendiente")
    .select("id");

  // Actualizar estado del plan
  const { error } = await supabase
    .from("extraordinary_plans")
    .update({
      status: "cancelado",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user?.id || null,
      cancellation_reason: reason,
    })
    .eq("id", planId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("Error cancelando plan", error);
    return { error: "No se pudo cancelar el plan" };
  }

  revalidatePath(`/app/${condominiumId}/extraordinary-plans`);
  revalidatePath(`/app/${condominiumId}/charges`);

  return {
    success: true,
    charges_cancelled: chargesCancelados?.length || 0,
  };
}

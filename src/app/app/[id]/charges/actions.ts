"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Charge, ChargeBatchType, ChargeType, UnitChargePreview } from "@/types/charges";
import { distribuir } from "@/lib/charges/calculations";

const BatchInputSchema = z.object({
  type: z.enum(["expensas_mensuales", "servicio_basico", "extraordinaria_masiva", "saldo_inicial"]),
  charge_type: z.enum([
    "expensa_mensual",
    "servicio_basico",
    "extraordinaria_masiva",
    "saldo_inicial",
    "multa",
    "reserva",
    "otro",
  ]),
  expense_item_id: z.string().uuid(),
  period: z.string(), // YYYY-MM-01
  posted_date: z.string(),
  due_date: z.string(),
  description: z.string().optional().or(z.literal("")),
  utility_bill_id: z.string().uuid().optional().or(z.literal("")),
  unidades: z.array(
    z.object({
      unit_id: z.string().uuid(),
      amount: z.number().nonnegative(),
      include: z.boolean(),
      detail: z.string().optional().or(z.literal("")),
    })
  ),
});

export async function getRubrosIngreso(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_items")
    .select("id, name, classification")
    .eq("condominium_id", condominiumId)
    .eq("category", "ingreso")
    .eq("is_active", true)
    .order("name");
  if (error) return [];
  return data || [];
}

export async function getActiveDistributionMethod(condominiumId: string): Promise<"por_aliquota" | "igualitario"> {
  const supabase = await createClient();
  const { data: condo } = await supabase
    .from("condominiums")
    .select("active_budget_master_id")
    .eq("id", condominiumId)
    .single();
  if (!condo?.active_budget_master_id) return "por_aliquota";

  const { data: budget } = await supabase
    .from("budgets_master")
    .select("distribution_method")
    .eq("id", condo.active_budget_master_id)
    .maybeSingle();

  return (budget?.distribution_method as "por_aliquota" | "igualitario") || "por_aliquota";
}

export async function getActiveBudgetMaster(condominiumId: string) {
  const supabase = await createClient();
  const { data: condo } = await supabase
    .from("condominiums")
    .select("active_budget_master_id")
    .eq("id", condominiumId)
    .single();

  const activeId = condo?.active_budget_master_id;
  let master = null;

  if (activeId) {
    const { data } = await supabase
      .from("budgets_master")
      .select("id, budget_type, total_annual_amount, distribution_method")
      .eq("id", activeId)
      .single();
    master = data;
  }

  // Fallback: tomar el presupuesto aprobado más reciente si no hay activo o RLS bloquea el single
  if (!master) {
    const { data } = await supabase
      .from("budgets_master")
      .select("id, budget_type, total_annual_amount, distribution_method")
      .eq("condominium_id", condominiumId)
      .eq("status", "aprobado")
      .order("year", { ascending: false })
      .limit(1)
      .maybeSingle();
    master = data;
  }

  if (!master) return null;
  return master as { id: string; budget_type: "global" | "detallado"; total_annual_amount: number; distribution_method: string | null };
}

export async function getUnitsForCharges(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .select("id, identifier, full_identifier, aliquot, status")
    .eq("condominium_id", condominiumId)
    .eq("status", "activa")
    .order("identifier");

  if (error) {
    console.error("Error listando unidades para cargos", error);
    return [];
  }

  const unidades = data || [];
  const unitIds = unidades.map((u) => u.id);
  const contactosMap = new Map<string, string>();

  if (unitIds.length > 0) {
    const { data: contactos } = await supabase
      .from("unit_contacts")
      .select("unit_id, is_primary_contact, end_date, profile:profiles(full_name)")
      .in("unit_id", unitIds)
      .eq("is_primary_contact", true)
      .is("end_date", null);

    (contactos || []).forEach((c: any) => {
      const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile;
      contactosMap.set(c.unit_id, profile?.full_name || "");
    });
  }

  return unidades.map((u) => ({
    unit_id: u.id,
    unit_name: u.full_identifier || u.identifier || "Unidad",
    aliquot: u.aliquot,
    contact_name: contactosMap.get(u.id) || "",
  }));
}

export async function prepararExpensasPreview(
  condominiumId: string,
  total: number
): Promise<{ unidades: UnitChargePreview[]; metodo: "por_aliquota" | "igualitario" }> {
  const metodo = await getActiveDistributionMethod(condominiumId);
  const unidades = await getUnitsForCharges(condominiumId);
  const preview = distribuir(unidades, total, metodo);
  return { unidades: preview, metodo };
}

export async function prepararExpensasPorPresupuesto(
  condominiumId: string,
  expenseItemId: string,
  period: string
): Promise<{ unidades: UnitChargePreview[]; total: number; metodo: "por_aliquota" | "igualitario" } | { error: string }> {
  const supabase = await createClient();
  const metodo = await getActiveDistributionMethod(condominiumId);

  // 1) Intentar monto mensual por rubro en presupuesto detallado
  const { data: lineas } = await supabase
    .from("budgets")
    .select("amount")
    .eq("condominium_id", condominiumId)
    .eq("expense_item_id", expenseItemId)
    .eq("period", period);

  let total = (lineas || []).reduce((acc: number, l: { amount?: number | null }) => acc + Number(l.amount || 0), 0);

  // 2) Si no hay lineas, usar presupuesto activo (global o total mensual) como fallback
  if (total <= 0) {
    const master = await getActiveBudgetMaster(condominiumId);
    if (!master) {
      // Sin presupuesto, devolver 0 pero sin bloquear la UI
      return { unidades: [], total: 0, metodo };
    }
    const monthly = Number(master.total_annual_amount || 0) / 12;
    if (monthly <= 0) {
      return { unidades: [], total: 0, metodo };
    }
    total = monthly;
  }

  const unidades = await getUnitsForCharges(condominiumId);
  if (unidades.length === 0) {
    return { unidades: [], total, metodo };
  }

  const preview = distribuir(unidades, total, metodo);
  return { unidades: preview, total, metodo };
}

export async function crearBatchYCharges(condominiumId: string, payload: unknown) {
  const parsed = BatchInputSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const supabase = await createClient();

  // Evitar duplicar cargos del mismo rubro y periodo (por ejemplo expensas del mismo mes)
  const { data: existentes } = await supabase
    .from("charges")
    .select("id, status")
    .eq("condominium_id", condominiumId)
    .eq("expense_item_id", data.expense_item_id)
    .eq("period", data.period)
    .neq("status", "cancelado")
    .limit(1);

  if (existentes && existentes.length > 0) {
    return { error: "Ya existen cargos generados para este rubro y periodo. Anula o borra los existentes antes de volver a crear." };
  }

  const { data: batch, error: batchError } = await supabase
    .from("charge_batches")
    .insert({
      condominium_id: condominiumId,
      type: data.type as ChargeBatchType,
      expense_item_id: data.expense_item_id,
      period: data.period,
      posted_date: data.posted_date,
      due_date: data.due_date,
      description: data.description || null,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    console.error("Error creando batch", batchError);
    return { error: "No se pudo crear el lote." };
  }

  const chargesRows = data.unidades
    .filter((u) => u.include && u.amount > 0)
    .map((u) => {
      const base = (data.description || "").trim();
      const det = (u.detail || "").trim();
      const description =
        det && det !== base ? `${base ? `${base} - ` : ""}${det}` : base || det || null;
      return {
        condominium_id: condominiumId,
        unit_id: u.unit_id,
        expense_item_id: data.expense_item_id,
        utility_bill_id: data.utility_bill_id || null,
        period: data.period,
        posted_date: data.posted_date,
        due_date: data.due_date,
        total_amount: u.amount,
        paid_amount: 0,
        status: "pendiente",
        charge_type: data.charge_type as ChargeType,
        description,
        batch_id: batch.id,
      };
    });

  if (chargesRows.length === 0) return { error: "No hay unidades incluidas con monto > 0." };

  const { error: chargesError } = await supabase.from("charges").insert(chargesRows);
  if (chargesError) {
    console.error("Error insertando cargos", chargesError);
    return { error: "No se pudieron generar los cargos." };
  }

  revalidatePath(`/app/${condominiumId}/charges`);
  return {
    success: true,
    batchId: batch.id,
    totalCargos: chargesRows.length,
    montoTotal: chargesRows.reduce((acc, c) => acc + c.total_amount, 0),
  };
}

export async function crearCargoIndividual(input: {
  condominium_id: string;
  unit_id: string;
  expense_item_id: string;
  posted_date: string;
  due_date: string;
  period?: string | null;
  total_amount: number;
  description?: string;
  charge_type: ChargeType;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("charges").insert({
    condominium_id: input.condominium_id,
    unit_id: input.unit_id,
    expense_item_id: input.expense_item_id,
    utility_bill_id: null,
    period: input.period || null,
    posted_date: input.posted_date,
    due_date: input.due_date,
    total_amount: input.total_amount,
    paid_amount: 0,
    status: "pendiente",
    charge_type: input.charge_type,
    description: input.description || null,
    batch_id: null,
  });
  if (error) {
    console.error("Error creando cargo individual", error);
    return { error: "No se pudo crear el cargo." };
  }
  revalidatePath(`/app/${input.condominium_id}/charges`);
  return { success: true };
}

export async function listarCharges(
  condominiumId: string,
  filters?: { period?: string; status?: string; expenseItemId?: string; unitId?: string; page?: number; pageSize?: number }
): Promise<{ charges: Charge[]; count: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("charges")
    .select(
      `
      *,
      unit:units(
        identifier,
        full_identifier,
        unit_contacts(is_primary_contact,end_date,profiles(full_name))
      ),
      expense_item:expense_items(name)
    `,
      { count: "exact" }
    )
    .eq("condominium_id", condominiumId)
    .order("posted_date", { ascending: false });

  if (filters?.period) query = query.eq("period", filters.period);
  if (filters?.status && filters.status !== "todos") query = query.eq("status", filters.status);
  if (filters?.expenseItemId) query = query.eq("expense_item_id", filters.expenseItemId);
  if (filters?.unitId) query = query.eq("unit_id", filters.unitId);

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error("Error listando charges", error);
    return { charges: [], count: 0 };
  }
  const sorted =
    (data as Charge[] | null)?.sort((a, b) => {
      const unitA = a.unit as { full_identifier?: string | null; identifier?: string | null } | null;
      const unitB = b.unit as { full_identifier?: string | null; identifier?: string | null } | null;
     const aName = unitA?.full_identifier || unitA?.identifier || "";
     const bName = unitB?.full_identifier || unitB?.identifier || "";
     if (aName.toLowerCase() === bName.toLowerCase()) {
       return (b.posted_date || "").localeCompare(a.posted_date || "");
     }
      return aName.localeCompare(bName);
    }) || [];
  return { charges: sorted, count: count || 0 };
}

export async function anularCargo(condominiumId: string, chargeId: string, reason: string, cancelledByProfileId: string) {
  const supabase = await createClient();

  const { data: alloc } = await supabase
    .from("payment_allocations")
    .select("id")
    .eq("charge_id", chargeId)
    .limit(1);
  if ((alloc || []).length > 0) {
    return { error: "El cargo tiene pagos asociados. Debes anular o corregir el pago antes." };
  }

  const { error } = await supabase
    .from("charges")
    .update({
      status: "cancelado",
      cancellation_reason: reason || "Anulado por administrador",
      cancelled_at: new Date().toISOString(),
      cancelled_by_profile_id: cancelledByProfileId,
    })
    .eq("id", chargeId)
    .eq("condominium_id", condominiumId);

  if (error) return { error: "No se pudo anular el cargo." };

  await supabase.from("audit_logs").insert({
    entity: "charge",
    entity_id: chargeId,
    action: "cancel",
    performed_by: cancelledByProfileId,
    data: { reason },
  });

  revalidatePath(`/app/${condominiumId}/charges`);
  return { success: true };
}

export async function eliminarCargo(condominiumId: string, chargeId: string, reason?: string) {
  const supabase = await createClient();

  // Si tiene pagos, no permitir borrar - debe anularse primero
  const { data: alloc } = await supabase
    .from("payment_allocations")
    .select("id")
    .eq("charge_id", chargeId)
    .limit(1);
  if ((alloc || []).length > 0) {
    return { error: "No puedes borrar un cargo que tiene pagos aplicados. Anula el cargo o corrige el pago primero." };
  }

  // SOFT DELETE: cambiar estado a 'eliminado' en lugar de DELETE físico
  const { error } = await supabase
    .from("charges")
    .update({
      status: "eliminado",
      cancellation_reason: reason || "Eliminado por administrador",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", chargeId)
    .eq("condominium_id", condominiumId);

  if (error) return { error: "No se pudo eliminar el cargo." };

  revalidatePath(`/app/${condominiumId}/charges`);
  return { success: true };
}

export async function eliminarCargosMasivos(condominiumId: string, chargeIds: string[], reason?: string) {
  if (!Array.isArray(chargeIds) || chargeIds.length === 0) return { error: "Selecciona al menos un cargo." };
  const supabase = await createClient();

  // Identificar cargos con pagos - estos no se pueden eliminar
  const { data: conPagos } = await supabase
    .from("payment_allocations")
    .select("charge_id")
    .in("charge_id", chargeIds);

  const idsConPago = new Set((conPagos || []).map((r: { charge_id: string }) => r.charge_id));
  const idsSinPago = chargeIds.filter((id) => !idsConPago.has(id));

  // SOFT DELETE: cambiar estado a 'eliminado' en lugar de DELETE físico
  if (idsSinPago.length > 0) {
    await supabase
      .from("charges")
      .update({
        status: "eliminado",
        cancellation_reason: reason || "Eliminación masiva por administrador",
        cancelled_at: new Date().toISOString(),
      })
      .in("id", idsSinPago)
      .eq("condominium_id", condominiumId);
  }

  revalidatePath(`/app/${condominiumId}/charges`);
  return {
    success: true,
    eliminados: idsSinPago.length,
    bloqueados: idsConPago.size,
  };
}

export async function actualizarCargoLigero(
  condominiumId: string,
  chargeId: string,
  payload: { description?: string; period?: string | null; posted_date?: string; due_date?: string; total_amount?: number }
) {
  const supabase = await createClient();

  const { data: charge } = await supabase
    .from("charges")
    .select("status, paid_amount")
    .eq("id", chargeId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();
  if (!charge) return { error: "Cargo no encontrado." };
  if (charge.status !== "pendiente") return { error: "Solo se pueden editar cargos pendientes." };
  if ((charge.paid_amount || 0) > 0) return { error: "No puedes editar un cargo con pagos aplicados." };

  const updatePayload: Record<string, string | number | null> = {};
  if (payload.description !== undefined) updatePayload.description = payload.description || null;
  if (payload.period !== undefined) updatePayload.period = payload.period;
  if (payload.posted_date !== undefined) updatePayload.posted_date = payload.posted_date;
  if (payload.due_date !== undefined) updatePayload.due_date = payload.due_date;
  if (payload.total_amount !== undefined) {
    updatePayload.total_amount = payload.total_amount;
  }

  const { error } = await supabase
    .from("charges")
    .update(updatePayload)
    .eq("id", chargeId)
    .eq("condominium_id", condominiumId);

  if (error) return { error: "No se pudo actualizar el cargo." };

  await supabase.from("audit_logs").insert({
    entity: "charge",
    entity_id: chargeId,
    action: "update",
    data: updatePayload,
  });

  revalidatePath(`/app/${condominiumId}/charges`);
  return { success: true };
}

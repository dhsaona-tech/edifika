"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/logAudit";
import { revalidatePath } from "next/cache";
import {
  createUtilityBillSchema,
  updateBillHeaderSchema,
  saveReadingsSchema,
} from "@/lib/readings/schemas";
import type {
  UtilityBill,
  UtilityBillWithReadings,
  UtilityReading,
} from "@/types/readings";
import type { Rubro } from "@/types/expense-items";
import { crearBatchYCharges } from "../charges/actions";

// ============================================================
// Helpers
// ============================================================

function redondear(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Obtener unidades padre activas (sin parent_unit_id) */
export async function getParentUnitsForReadings(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .select("id, identifier, full_identifier, block_identifier, type, aliquot, area")
    .eq("condominium_id", condominiumId)
    .is("parent_unit_id", null)
    .eq("status", "activa")
    .order("full_identifier", { ascending: true });

  if (error) {
    console.error("Error obteniendo unidades:", error);
    return [];
  }
  return data || [];
}

/** Obtener rubros de gasto activos */
export async function getRubrosGasto(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_items")
    .select("id, name, description, allocation_method")
    .eq("condominium_id", condominiumId)
    .eq("category", "gasto")
    .eq("is_active", true)
    .is("parent_id", null)
    .order("name");

  if (error) {
    console.error("Error obteniendo rubros:", error);
    return [];
  }
  return (data || []) as Pick<Rubro, "id" | "name" | "description" | "allocation_method">[];
}

// ============================================================
// 1. Listar utility_bills
// ============================================================
export async function listUtilityBills(
  condominiumId: string,
  filters?: { period?: string; status?: string; expenseItemId?: string }
): Promise<{ bills: UtilityBill[]; count: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("utility_bills")
    .select("*, expense_item:expense_items(name)", { count: "exact" })
    .eq("condominium_id", condominiumId)
    .order("period", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.period) query = query.eq("period", filters.period);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.expenseItemId) query = query.eq("expense_item_id", filters.expenseItemId);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error listando utility_bills:", error);
    return { bills: [], count: 0 };
  }

  return { bills: (data || []) as UtilityBill[], count: count || 0 };
}

// ============================================================
// 2. Obtener utility_bill con lecturas
// ============================================================
export async function getUtilityBill(
  condominiumId: string,
  billId: string
): Promise<UtilityBillWithReadings | null> {
  const supabase = await createClient();

  const { data: bill, error } = await supabase
    .from("utility_bills")
    .select("*, expense_item:expense_items(name)")
    .eq("id", billId)
    .eq("condominium_id", condominiumId)
    .single();

  if (error || !bill) {
    console.error("Error obteniendo utility_bill:", error);
    return null;
  }

  // Obtener lecturas con joins a units y charges
  const { data: readings } = await supabase
    .from("utility_readings")
    .select(
      `
      *,
      unit:units(identifier, full_identifier, block_identifier),
      charge:charges(status)
    `
    )
    .eq("utility_bill_id", billId)
    .order("unit(full_identifier)", { ascending: true });

  return {
    ...(bill as UtilityBill),
    utility_readings: (readings || []) as UtilityReading[],
  };
}

// ============================================================
// 3. Crear utility_bill (cabecera)
// ============================================================
export async function createUtilityBill(condominiumId: string, payload: unknown) {
  const parsed = createUtilityBillSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  if (data.condominium_id !== condominiumId) {
    return { error: "ID de condominio no coincide." };
  }

  const supabase = await createClient();

  // Verificar que no exista otro bill activo (closed/billed) del mismo rubro+periodo
  const { data: existing } = await supabase
    .from("utility_bills")
    .select("id, status")
    .eq("condominium_id", condominiumId)
    .eq("expense_item_id", data.expense_item_id)
    .eq("period", data.period)
    .in("status", ["closed", "billed"])
    .limit(1);

  if (existing && existing.length > 0) {
    return {
      error: "Ya existe una lectura cerrada o facturada para este rubro y periodo.",
    };
  }

  // Calcular average_unit_cost para meter_based
  const average_unit_cost =
    data.mode === "meter_based" && data.total_matrix_consumption
      ? data.total_amount / data.total_matrix_consumption
      : null;

  // Insertar cabecera
  const { data: bill, error: billError } = await supabase
    .from("utility_bills")
    .insert({
      condominium_id: condominiumId,
      expense_item_id: data.expense_item_id,
      mode: data.mode,
      unit_of_measure: data.unit_of_measure || null,
      period: data.period,
      total_matrix_consumption: data.total_matrix_consumption || null,
      total_amount: data.total_amount,
      average_unit_cost,
      communal_consumption: null,
      allocation_method: data.allocation_method || null,
      status: "draft",
      invoice_number: data.invoice_number || null,
      invoice_date: data.invoice_date || null,
      line_items: data.line_items || null,
      notes: data.notes || null,
    })
    .select("id")
    .single();

  if (billError || !bill) {
    console.error("Error creando utility_bill:", billError);
    return { error: "No se pudo crear la lectura." };
  }

  // Para meter_based: auto-poblar utility_readings para todas las unidades padre
  if (data.mode === "meter_based") {
    const units = await getParentUnitsForReadings(condominiumId);

    // Obtener lecturas previas del último bill billed/closed del mismo rubro
    const previousReadings = await getLastReadingsMap(condominiumId, data.expense_item_id);

    const readingsRows = units.map((unit) => ({
      utility_bill_id: bill.id,
      unit_id: unit.id,
      previous_reading: previousReadings.get(unit.id) ?? 0,
      current_reading: previousReadings.get(unit.id) ?? 0, // Inicia igual a previous
      calculated_amount: 0,
    }));

    if (readingsRows.length > 0) {
      const { error: readingsError } = await supabase
        .from("utility_readings")
        .insert(readingsRows);

      if (readingsError) {
        console.error("Error insertando lecturas iniciales:", readingsError);
        // No fallamos la creación del bill, pero logueamos
      }
    }
  }

  // Audit
  logAudit({
    condominiumId,
    tableName: "utility_bills",
    recordId: bill.id,
    action: "CREATE",
    newValues: { mode: data.mode, period: data.period, total_amount: data.total_amount },
  });

  revalidatePath(`/app/${condominiumId}/readings`);
  return { success: true, billId: bill.id };
}

// ============================================================
// 4. Actualizar cabecera (solo draft)
// ============================================================
export async function updateBillHeader(
  condominiumId: string,
  billId: string,
  payload: unknown
) {
  const parsed = updateBillHeaderSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const supabase = await createClient();

  // Verificar que sea draft
  const { data: bill } = await supabase
    .from("utility_bills")
    .select("id, status, mode, total_amount, total_matrix_consumption")
    .eq("id", billId)
    .eq("condominium_id", condominiumId)
    .single();

  if (!bill) return { error: "Lectura no encontrada." };
  if (bill.status !== "draft") return { error: "Solo se puede editar en estado borrador." };

  // Calcular nuevo average_unit_cost si aplica
  const newTotalAmount = data.total_amount ?? bill.total_amount;
  const newMatrixConsumption = data.total_matrix_consumption ?? bill.total_matrix_consumption;
  const average_unit_cost =
    bill.mode === "meter_based" && newMatrixConsumption
      ? newTotalAmount / newMatrixConsumption
      : null;

  // Actualizar cabecera
  const updateData: Record<string, unknown> = {};
  if (data.total_amount !== undefined) updateData.total_amount = data.total_amount;
  if (data.total_matrix_consumption !== undefined)
    updateData.total_matrix_consumption = data.total_matrix_consumption;
  if (data.unit_of_measure !== undefined) updateData.unit_of_measure = data.unit_of_measure;
  if (data.allocation_method !== undefined) updateData.allocation_method = data.allocation_method;
  if (data.invoice_number !== undefined) updateData.invoice_number = data.invoice_number || null;
  if (data.invoice_date !== undefined) updateData.invoice_date = data.invoice_date || null;
  if (data.line_items !== undefined) updateData.line_items = data.line_items || null;
  if (data.notes !== undefined) updateData.notes = data.notes || null;
  updateData.average_unit_cost = average_unit_cost;

  const { error: updateError } = await supabase
    .from("utility_bills")
    .update(updateData)
    .eq("id", billId);

  if (updateError) {
    console.error("Error actualizando cabecera:", updateError);
    return { error: "No se pudo actualizar." };
  }

  // Recalcular calculated_amount de cada lectura si cambió el costo unitario
  if (bill.mode === "meter_based" && average_unit_cost !== null) {
    await recalculateReadingAmounts(billId, average_unit_cost);
    await recalculateCommunalConsumption(billId, newMatrixConsumption ?? 0);
  }

  revalidatePath(`/app/${condominiumId}/readings`);
  revalidatePath(`/app/${condominiumId}/readings/${billId}`);
  return { success: true };
}

// ============================================================
// 5. Guardar lecturas (bulk upsert, solo draft)
// ============================================================
export async function saveReadings(condominiumId: string, billId: string, payload: unknown) {
  const parsed = saveReadingsSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const supabase = await createClient();

  // Verificar que sea draft
  const { data: bill } = await supabase
    .from("utility_bills")
    .select("id, status, average_unit_cost, total_matrix_consumption")
    .eq("id", billId)
    .eq("condominium_id", condominiumId)
    .single();

  if (!bill) return { error: "Lectura no encontrada." };
  if (bill.status !== "draft") return { error: "Solo se puede editar en estado borrador." };

  const avgCost = bill.average_unit_cost ?? 0;

  // Actualizar cada lectura
  const updates = data.readings.map(async (r) => {
    // Obtener previous_reading de la fila existente
    const { data: existing } = await supabase
      .from("utility_readings")
      .select("id, previous_reading")
      .eq("utility_bill_id", billId)
      .eq("unit_id", r.unit_id)
      .single();

    if (!existing) return null;

    const consumption = r.current_reading - existing.previous_reading;
    const calculated_amount = redondear(consumption * avgCost);

    return supabase
      .from("utility_readings")
      .update({
        current_reading: r.current_reading,
        calculated_amount: Math.max(0, calculated_amount),
      })
      .eq("id", existing.id);
  });

  await Promise.all(updates);

  // Recalcular consumo comunal
  await recalculateCommunalConsumption(billId, bill.total_matrix_consumption ?? 0);

  revalidatePath(`/app/${condominiumId}/readings/${billId}`);
  return { success: true };
}

// ============================================================
// 6. Cerrar lectura (draft -> closed)
// ============================================================
export async function markAsClosed(condominiumId: string, billId: string) {
  const supabase = await createClient();

  const { data: bill } = await supabase
    .from("utility_bills")
    .select("id, status, mode")
    .eq("id", billId)
    .eq("condominium_id", condominiumId)
    .single();

  if (!bill) return { error: "Lectura no encontrada." };
  if (bill.status !== "draft") return { error: "Solo se puede cerrar desde estado borrador." };

  // Validar lecturas para meter_based
  if (bill.mode === "meter_based") {
    const { data: readings } = await supabase
      .from("utility_readings")
      .select("id, unit_id, previous_reading, current_reading, consumption")
      .eq("utility_bill_id", billId);

    if (!readings || readings.length === 0) {
      return { error: "No hay lecturas registradas." };
    }

    // Verificar que ninguna lectura actual sea menor a la anterior
    const negativas = readings.filter(
      (r) => r.current_reading < r.previous_reading
    );
    if (negativas.length > 0) {
      return {
        error: `Hay ${negativas.length} lectura(s) donde la lectura actual es menor a la anterior. Corrige antes de cerrar.`,
      };
    }
  }

  const { error } = await supabase
    .from("utility_bills")
    .update({ status: "closed" })
    .eq("id", billId);

  if (error) return { error: "No se pudo cerrar la lectura." };

  logAudit({
    condominiumId,
    tableName: "utility_bills",
    recordId: billId,
    action: "UPDATE",
    newValues: { status: "closed" },
    notes: "Lectura cerrada",
  });

  revalidatePath(`/app/${condominiumId}/readings`);
  revalidatePath(`/app/${condominiumId}/readings/${billId}`);
  return { success: true };
}

// ============================================================
// 7. Reabrir lectura (closed -> draft)
// ============================================================
export async function reopenBill(condominiumId: string, billId: string) {
  const supabase = await createClient();

  const { data: bill } = await supabase
    .from("utility_bills")
    .select("id, status")
    .eq("id", billId)
    .eq("condominium_id", condominiumId)
    .single();

  if (!bill) return { error: "Lectura no encontrada." };
  if (bill.status !== "closed") return { error: "Solo se puede reabrir desde estado cerrado." };

  const { error } = await supabase
    .from("utility_bills")
    .update({ status: "draft" })
    .eq("id", billId);

  if (error) return { error: "No se pudo reabrir la lectura." };

  logAudit({
    condominiumId,
    tableName: "utility_bills",
    recordId: billId,
    action: "UPDATE",
    newValues: { status: "draft" },
    notes: "Lectura reabierta",
  });

  revalidatePath(`/app/${condominiumId}/readings`);
  revalidatePath(`/app/${condominiumId}/readings/${billId}`);
  return { success: true };
}

// ============================================================
// 8. Generar cargos (closed -> billed) - EL ACTION CRÍTICO
// ============================================================
export async function generateCharges(condominiumId: string, billId: string) {
  const supabase = await createClient();

  const { data: bill } = await supabase
    .from("utility_bills")
    .select("*, expense_item:expense_items(name)")
    .eq("id", billId)
    .eq("condominium_id", condominiumId)
    .single();

  if (!bill) return { error: "Lectura no encontrada." };
  if (bill.status !== "closed") return { error: "Solo se puede facturar desde estado cerrado." };

  const today = new Date().toISOString().split("T")[0];
  const expenseItem = bill.expense_item as unknown as { name: string } | null;
  const rubroName = expenseItem?.name || "Servicio";

  // Formatear periodo para descripcion
  const [year, month] = bill.period.split("-");
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const periodLabel = `${meses[Number(month) - 1]} ${year}`;

  let unidades: { unit_id: string; amount: number; include: boolean; detail: string }[] = [];

  if (bill.mode === "meter_based") {
    // Obtener lecturas
    const { data: readings } = await supabase
      .from("utility_readings")
      .select("id, unit_id, consumption, calculated_amount")
      .eq("utility_bill_id", billId);

    if (!readings || readings.length === 0) {
      return { error: "No hay lecturas para facturar." };
    }

    unidades = readings.map((r) => ({
      unit_id: r.unit_id,
      amount: redondear(r.calculated_amount),
      include: r.consumption > 0,
      detail: `${r.consumption} ${bill.unit_of_measure || ""}`.trim(),
    }));
  } else {
    // Modo allocation: distribuir por alícuota o igualitario
    const units = await getParentUnitsForReadings(condominiumId);
    const metodo = bill.allocation_method || "por_aliquota";

    const { distribuir } = await import("@/lib/charges/calculations");
    const preview = distribuir(
      units.map((u) => ({
        unit_id: u.id,
        unit_name: u.full_identifier || u.identifier,
        aliquot: u.aliquot,
      })),
      bill.total_amount,
      metodo as "por_aliquota" | "igualitario"
    );

    unidades = preview.map((p) => ({
      unit_id: p.unit_id,
      amount: p.final_amount,
      include: p.final_amount > 0,
      detail: metodo === "por_aliquota" ? `Alíc. ${p.aliquot ?? 0}%` : "Igualitario",
    }));
  }

  // Usar crearBatchYCharges para generar los cargos
  const result = await crearBatchYCharges(condominiumId, {
    type: "servicio_basico",
    charge_type: "servicio_basico",
    expense_item_id: bill.expense_item_id,
    period: bill.period,
    posted_date: today,
    due_date: today, // El admin puede ajustar luego
    description: `${rubroName} ${periodLabel}`,
    utility_bill_id: bill.id,
    unidades,
  });

  if ("error" in result && result.error) {
    return { error: result.error as string };
  }

  // Para meter_based: vincular charge_id en cada lectura
  if (bill.mode === "meter_based") {
    // Obtener los cargos recién creados vinculados a este bill
    const { data: charges } = await supabase
      .from("charges")
      .select("id, unit_id")
      .eq("utility_bill_id", billId)
      .eq("status", "pendiente");

    if (charges) {
      const chargeMap = new Map(charges.map((c) => [c.unit_id, c.id]));

      const { data: readings } = await supabase
        .from("utility_readings")
        .select("id, unit_id")
        .eq("utility_bill_id", billId);

      if (readings) {
        for (const reading of readings) {
          const chargeId = chargeMap.get(reading.unit_id);
          if (chargeId) {
            await supabase
              .from("utility_readings")
              .update({ charge_id: chargeId })
              .eq("id", reading.id);
          }
        }
      }
    }
  }

  // Actualizar status del bill a billed
  await supabase
    .from("utility_bills")
    .update({ status: "billed" })
    .eq("id", billId);

  logAudit({
    condominiumId,
    tableName: "utility_bills",
    recordId: billId,
    action: "APROBACION",
    newValues: { status: "billed", charges_generated: unidades.length },
    notes: `Cargos generados: ${rubroName} ${periodLabel}`,
  });

  revalidatePath(`/app/${condominiumId}/readings`);
  revalidatePath(`/app/${condominiumId}/readings/${billId}`);
  revalidatePath(`/app/${condominiumId}/charges`);
  return { success: true };
}

// ============================================================
// 9. Obtener últimas lecturas (para auto-fill previous_reading)
// ============================================================
export async function getLastReadings(condominiumId: string, expenseItemId: string) {
  return Object.fromEntries(await getLastReadingsMap(condominiumId, expenseItemId));
}

async function getLastReadingsMap(
  condominiumId: string,
  expenseItemId: string
): Promise<Map<string, number>> {
  const supabase = await createClient();

  // Buscar el último bill billed o closed del mismo rubro
  const { data: lastBill } = await supabase
    .from("utility_bills")
    .select("id")
    .eq("condominium_id", condominiumId)
    .eq("expense_item_id", expenseItemId)
    .in("status", ["billed", "closed"])
    .order("period", { ascending: false })
    .limit(1)
    .single();

  if (!lastBill) return new Map();

  const { data: readings } = await supabase
    .from("utility_readings")
    .select("unit_id, current_reading")
    .eq("utility_bill_id", lastBill.id);

  if (!readings) return new Map();

  return new Map(readings.map((r) => [r.unit_id, r.current_reading]));
}

// ============================================================
// 10. Eliminar lectura (solo draft)
// ============================================================
export async function deleteBill(condominiumId: string, billId: string) {
  const supabase = await createClient();

  const { data: bill } = await supabase
    .from("utility_bills")
    .select("id, status")
    .eq("id", billId)
    .eq("condominium_id", condominiumId)
    .single();

  if (!bill) return { error: "Lectura no encontrada." };
  if (bill.status !== "draft") return { error: "Solo se puede eliminar en estado borrador." };

  // CASCADE eliminará las utility_readings automáticamente
  const { error } = await supabase.from("utility_bills").delete().eq("id", billId);

  if (error) {
    console.error("Error eliminando bill:", error);
    return { error: "No se pudo eliminar." };
  }

  logAudit({
    condominiumId,
    tableName: "utility_bills",
    recordId: billId,
    action: "DELETE",
    notes: "Lectura eliminada (borrador)",
  });

  revalidatePath(`/app/${condominiumId}/readings`);
  return { success: true };
}

// ============================================================
// 11. Re-facturar lectura individual (cargo anulado)
// ============================================================
export async function rebillSingleReading(
  condominiumId: string,
  billId: string,
  readingId: string
) {
  const supabase = await createClient();

  // Obtener el bill y la lectura
  const { data: bill } = await supabase
    .from("utility_bills")
    .select("id, status, expense_item_id, period, unit_of_measure, expense_item:expense_items(name)")
    .eq("id", billId)
    .eq("condominium_id", condominiumId)
    .single();

  if (!bill) return { error: "Lectura no encontrada." };
  if (bill.status !== "billed") return { error: "Solo se puede re-facturar lecturas facturadas." };

  const { data: reading } = await supabase
    .from("utility_readings")
    .select("*, charge:charges(id, status)")
    .eq("id", readingId)
    .eq("utility_bill_id", billId)
    .single();

  if (!reading) return { error: "Lectura individual no encontrada." };

  // Verificar que el cargo fue anulado
  const chargeStatus = reading.charge?.status;
  if (chargeStatus && chargeStatus !== "cancelado" && chargeStatus !== "eliminado") {
    return { error: "El cargo asociado no ha sido anulado. Anúlalo primero desde Cargos." };
  }

  const today = new Date().toISOString().split("T")[0];
  const consumption = reading.current_reading - reading.previous_reading;
  const expenseItemRebill = bill.expense_item as unknown as { name: string } | null;
  const rubroName = expenseItemRebill?.name || "Servicio";

  // Crear cargo individual
  const { data: newCharge, error: chargeError } = await supabase
    .from("charges")
    .insert({
      condominium_id: condominiumId,
      unit_id: reading.unit_id,
      expense_item_id: bill.expense_item_id,
      utility_bill_id: billId,
      period: bill.period,
      posted_date: today,
      due_date: today,
      total_amount: reading.calculated_amount,
      paid_amount: 0,
      status: "pendiente",
      charge_type: "servicio_basico",
      description: `${rubroName} (re-facturado) - ${consumption} ${bill.unit_of_measure || ""}`.trim(),
    })
    .select("id")
    .single();

  if (chargeError || !newCharge) {
    console.error("Error re-facturando:", chargeError);
    return { error: "No se pudo crear el nuevo cargo." };
  }

  // Actualizar charge_id en la lectura
  await supabase
    .from("utility_readings")
    .update({ charge_id: newCharge.id })
    .eq("id", readingId);

  logAudit({
    condominiumId,
    tableName: "utility_readings",
    recordId: readingId,
    action: "UPDATE",
    newValues: { charge_id: newCharge.id, action: "rebill" },
    notes: `Re-facturación de lectura - Cargo ${newCharge.id}`,
  });

  revalidatePath(`/app/${condominiumId}/readings/${billId}`);
  revalidatePath(`/app/${condominiumId}/charges`);
  return { success: true };
}

// ============================================================
// Helpers internos
// ============================================================

/** Recalcular calculated_amount en todas las lecturas de un bill */
async function recalculateReadingAmounts(billId: string, averageUnitCost: number) {
  const supabase = await createClient();

  const { data: readings } = await supabase
    .from("utility_readings")
    .select("id, previous_reading, current_reading")
    .eq("utility_bill_id", billId);

  if (!readings) return;

  for (const r of readings) {
    const consumption = r.current_reading - r.previous_reading;
    const calculated_amount = redondear(Math.max(0, consumption * averageUnitCost));

    await supabase
      .from("utility_readings")
      .update({ calculated_amount })
      .eq("id", r.id);
  }
}

/** Recalcular consumo comunal del bill */
async function recalculateCommunalConsumption(billId: string, totalMatrixConsumption: number) {
  const supabase = await createClient();

  const { data: readings } = await supabase
    .from("utility_readings")
    .select("current_reading, previous_reading")
    .eq("utility_bill_id", billId);

  if (!readings) return;

  const sumConsumption = readings.reduce(
    (acc, r) => acc + (r.current_reading - r.previous_reading),
    0
  );

  const communal = redondear(totalMatrixConsumption - sumConsumption);

  await supabase
    .from("utility_bills")
    .update({ communal_consumption: communal })
    .eq("id", billId);
}

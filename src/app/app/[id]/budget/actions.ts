"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BudgetMaster, DistributionMethod } from "@/types/budget";

const BudgetPayloadSchema = z.object({
  budgetId: z.string().uuid().optional(),
  name: z.string().min(1, "El nombre es obligatorio"),
  year: z.coerce.number().int().min(2000).max(2100),
  budget_type: z.enum(["global", "detallado"]),
  distribution_method: z.enum(["por_aliquota", "igualitario", "manual_por_unidad"]),
  status: z.enum(["borrador", "aprobado", "inactivo"]),
  total_annual_amount: z.coerce.number().min(0).optional(),
  rubros: z
    .array(
      z.object({
        expense_item_id: z.string().uuid(),
        annual_amount: z.coerce.number().min(0),
      })
    )
    .optional(),
});

export async function getActiveBudgetMasterId(condominiumId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("condominiums")
    .select("active_budget_master_id")
    .eq("id", condominiumId)
    .single();
  return data?.active_budget_master_id || null;
}

export async function getBudgetsMaster(
  condominiumId: string,
  filters?: { year?: string; status?: string }
): Promise<{ budgets: BudgetMaster[]; activeBudgetId: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("budgets_master")
    .select("*")
    .eq("condominium_id", condominiumId)
    .order("year", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.year) {
    const parsedYear = Number(filters.year);
    if (!Number.isNaN(parsedYear)) {
      query = query.eq("year", parsedYear);
    }
  }

  if (filters?.status && filters.status !== "todos") {
    query = query.eq("status", filters.status);
  }

  const [{ data, error }, activeBudgetId] = await Promise.all([
    query,
    getActiveBudgetMasterId(condominiumId),
  ]);

  if (error) {
    console.error("Error cargando presupuestos", error);
    return { budgets: [], activeBudgetId };
  }

  return { budgets: data || [], activeBudgetId };
}

export async function getExpenseItemsPadre(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_items")
    .select("id, name")
    .eq("condominium_id", condominiumId)
    .eq("is_active", true)
    .eq("classification", "ordinario")
    .is("parent_id", null)
    .order("name");

  if (error) {
    console.error("Error cargando rubros", error);
    return [];
  }
  return data || [];
}

export async function getUnitsForDistribution(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .select("id, identifier, aliquot, status")
    .eq("condominium_id", condominiumId)
    .order("identifier");

  if (error) {
    console.error("Error cargando unidades", error);
    return [];
  }
  return data || [];
}

export async function createRubroPadre(
  condominiumId: string,
  payload: { name: string; description?: string | null }
) {
  const supabase = await createClient();
  const name = (payload.name || "").trim();
  if (!name) return { error: "Ingresa un nombre para el rubro" };

  const { data, error } = await supabase
    .from("expense_items")
    .insert({
      condominium_id: condominiumId,
      name,
      description: payload.description || null,
      category: "gasto",
      classification: "ordinario",
      allocation_method: "aliquot",
      parent_id: null,
      is_active: true,
    })
    .select("id, name")
    .single();

  if (error || !data) {
    console.error("Error creando rubro padre", error);
    return { error: "No se pudo crear el rubro." };
  }

  revalidatePath(`/app/${condominiumId}/budget`);
  return { success: true, rubro: data };
}

export async function saveBudget(condominiumId: string, payload: unknown) {
  const parsed = BudgetPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  // Si es global, el total anual es obligatorio; si es detallado se recalcula abajo.
  if (data.budget_type === "global" && (data.total_annual_amount ?? 0) <= 0) {
    return { error: "Ingresa un total anual mayor a 0 para presupuesto global." };
  }

  // Normalizar rubros (sumar si vienen repetidos) para evitar duplicados al generar meses
  let rubrosUnicos: { expense_item_id: string; annual_amount: number }[] = [];
  if (data.budget_type === "detallado") {
    const acumulado = new Map<string, number>();
    (data.rubros || []).forEach((r) => {
      const prev = acumulado.get(r.expense_item_id) || 0;
      acumulado.set(r.expense_item_id, prev + Number(r.annual_amount || 0));
    });
    rubrosUnicos = Array.from(acumulado.entries()).map(([expense_item_id, annual_amount]) => ({
      expense_item_id,
      annual_amount,
    }));
  }

  // Calcular total anual desde rubros en caso de detallado.
  const totalFromRubros =
    data.budget_type === "detallado"
      ? rubrosUnicos.reduce((acc, rubro) => acc + rubro.annual_amount, 0)
      : data.total_annual_amount ?? 0;

  if (data.budget_type === "detallado" && totalFromRubros <= 0) {
    return { error: "Ingresa al menos un valor anual en los rubros." };
  }

  const supabase = await createClient();

  // Crear o actualizar presupuesto maestro
  const masterPayload = {
    condominium_id: condominiumId,
    name: data.name,
    year: data.year,
    budget_type: data.budget_type,
    total_annual_amount: totalFromRubros,
    status: data.status,
    distribution_method: data.distribution_method as DistributionMethod,
  };

  let budgetId = data.budgetId;

  if (budgetId) {
    const { error, count } = await supabase
      .from("budgets_master")
      .update(masterPayload)
      .eq("id", budgetId)
      .eq("condominium_id", condominiumId)
      .select("id", { count: "exact", head: true });

    if (error) {
      if (error.code === "PGRST204" && error.message?.includes("distribution_method")) {
        return {
          error:
            "Falta la columna distribution_method en budgets_master. Aplica la migracion: ALTER TABLE public.budgets_master ADD COLUMN IF NOT EXISTS distribution_method text;",
        };
      }
      console.error("Error actualizando presupuesto", error);
      return { error: "No se pudo actualizar el presupuesto." };
    }

    if (count === 0) {
      return { error: "No se actualizó el presupuesto (verifica RLS o el condominium_id)." };
    }
  } else {
    const { data: inserted, error } = await supabase
      .from("budgets_master")
      .insert(masterPayload)
      .select("id")
      .single();
    if (error || !inserted) {
      if (error?.code === "PGRST204" && error.message?.includes("distribution_method")) {
        return {
          error:
            "Falta la columna distribution_method en budgets_master. Aplica la migracion: ALTER TABLE public.budgets_master ADD COLUMN IF NOT EXISTS distribution_method text;",
        };
      }
      console.error("Error creando presupuesto", error);
      return { error: "No se pudo crear el presupuesto." };
    }
    budgetId = inserted.id;
  }

  // Manejo de rubros y budgets (solo para detallado)
  if (data.budget_type === "detallado" && budgetId) {
    await supabase.from("budgets").delete().eq("budgets_master_id", budgetId);

    const meses = Array.from({ length: 12 }, (_, idx) => idx + 1);
    const budgetsRows = rubrosUnicos.flatMap((rubro) => {
      const monthly = rubro.annual_amount / 12;
      return meses.map((mes) => ({
        condominium_id: condominiumId,
        expense_item_id: rubro.expense_item_id,
        period: `${data.year}-${String(mes).padStart(2, "0")}-01`,
        amount: monthly,
        budgets_master_id: budgetId,
      }));
    });

    if (budgetsRows.length > 0) {
      // Borrar cualquier línea de ese condominio y año para evitar duplicados en la clave única
      const startPeriod = `${data.year}-01-01`;
      const endPeriod = `${data.year}-12-31`;
      await supabase
        .from("budgets")
        .delete()
        .eq("condominium_id", condominiumId)
        .gte("period", startPeriod)
        .lte("period", endPeriod);

      const { error } = await supabase.from("budgets").insert(budgetsRows);
      if (error) {
        if (error.code === "42501") {
          return {
            error:
              "Política RLS bloqueó la inserción en budgets. Asegura que las políticas permitan delete/insert para condominium_id actual.",
          };
        }
        console.error("Error guardando rubros del presupuesto", error);
        return { error: "No se pudieron guardar las lineas del presupuesto." };
      }
    }
  }

  // Si cambió a global, limpiar budgets para evitar residuos
  if (data.budget_type === "global" && budgetId) {
    await supabase.from("budgets").delete().eq("budgets_master_id", budgetId);
  }

  revalidatePath(`/app/${condominiumId}/budget`);
  if (budgetId) {
    revalidatePath(`/app/${condominiumId}/budget/${budgetId}`);
  }
  return { success: true, budgetId };
}

export async function setActiveBudget(condominiumId: string, budgetId: string) {
  const supabase = await createClient();

  const { error: condoError } = await supabase
    .from("condominiums")
    .update({ active_budget_master_id: budgetId })
    .eq("id", condominiumId);

  if (condoError) {
    console.error("Error marcando presupuesto activo", condoError);
    return { error: "No se pudo marcar como activo." };
  }

  const { error: statusError } = await supabase
    .from("budgets_master")
    .update({ status: "aprobado" })
    .eq("id", budgetId)
    .eq("condominium_id", condominiumId);

  if (statusError) {
    console.error("Error actualizando estado a aprobado", statusError);
    return { error: "Presupuesto activo, pero no se pudo actualizar el estado a aprobado." };
  }

  revalidatePath(`/app/${condominiumId}/budget`);
  revalidatePath(`/app/${condominiumId}/budget/${budgetId}`);
  return { success: true };
}

export async function deactivateBudget(condominiumId: string, budgetId: string) {
  const supabase = await createClient();

  // Si estaba activo, limpiar el activo
  const { data: condo } = await supabase
    .from("condominiums")
    .select("active_budget_master_id")
    .eq("id", condominiumId)
    .single();

  if (condo?.active_budget_master_id === budgetId) {
    await supabase
      .from("condominiums")
      .update({ active_budget_master_id: null })
      .eq("id", condominiumId);
  }

  const { error } = await supabase
    .from("budgets_master")
    .update({ status: "inactivo" })
    .eq("id", budgetId);

  if (error) {
    console.error("Error desactivando presupuesto", error);
    return { error: "No se pudo desactivar el presupuesto." };
  }

  revalidatePath(`/app/${condominiumId}/budget`);
  revalidatePath(`/app/${condominiumId}/budget/${budgetId}`);
  return { success: true };
}

export async function deleteBudget(condominiumId: string, budgetId: string) {
  const supabase = await createClient();

  // Limpiar activo si corresponde
  const { data: condo } = await supabase
    .from("condominiums")
    .select("active_budget_master_id")
    .eq("id", condominiumId)
    .single();

  if (condo?.active_budget_master_id === budgetId) {
    await supabase
      .from("condominiums")
      .update({ active_budget_master_id: null })
      .eq("id", condominiumId);
  }

  // Borrar lineas y maestro
  await supabase.from("budgets").delete().eq("budgets_master_id", budgetId);
  const { error } = await supabase.from("budgets_master").delete().eq("id", budgetId);

  if (error) {
    console.error("Error eliminando presupuesto", error);
    return { error: "No se pudo eliminar el presupuesto." };
  }

  revalidatePath(`/app/${condominiumId}/budget`);
  return { success: true };
}

export async function getBudgetDetail(budgetId: string) {
  const supabase = await createClient();

  const { data: master } = await supabase
    .from("budgets_master")
    .select("*")
    .eq("id", budgetId)
    .single();

  if (!master) return null;

  // Resumen de rubros: sumar mensual por expense_item y multiplicar por 12 para anual
  const { data: lines, error } = await supabase
    .from("budgets")
    .select("amount, expense_item_id, expense_items(name)")
    .eq("budgets_master_id", budgetId);

  if (error) {
    console.error("Error cargando lineas de presupuesto", error);
  }

  const rubrosResumen =
    lines?.reduce<
      Record<
        string,
        { name: string; monthly_amount: number; annual_amount: number; expense_item_id: string }
      >
    >((acc, line) => {
      const key = line.expense_item_id;
      const monthly = Number(line.amount || 0);
      if (!acc[key]) {
        acc[key] = {
          expense_item_id: key,
          name: (line as any).expense_items?.name || "Rubro",
          monthly_amount: 0,
          annual_amount: 0,
        };
      }
      acc[key].monthly_amount = monthly; // monto mensual fijo
      acc[key].annual_amount += monthly;
      return acc;
    }, {}) || {};

  // Ajustar anual = mensual acumulado (por 12 meses insertados); ya sumamos 12 veces arriba.
  const rubros = Object.values(rubrosResumen).map((rubro) => ({
    ...rubro,
    annual_amount: rubro.annual_amount, // ya sumado por cada mes
  }));

  return { master, rubros };
}

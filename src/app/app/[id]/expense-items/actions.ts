"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CategoriaRubro,
  ContextoPresupuestoDetallado,
  Rubro,
  RubroConSubrubros,
} from "@/types/expense-items";

const RubroPadreSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional().or(z.literal("")),
  category: z.enum(["gasto", "ingreso"]),
  classification: z.enum(["ordinario", "extraordinario"]),
  is_active: z.boolean().default(true),
});

const SubrubroSchema = z.object({
  parent_id: z.string().uuid(),
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

const RUBROS_INGRESO_POR_DEFECTO = [
  "Expensas Mensuales",
  "Servicios Basicos",
  "Multas",
  "Reservas",
  "Otros",
];

function normalize(val: FormDataEntryValue | null) {
  return typeof val === "string" ? val.trim() : val;
}

export async function ensureRubrosIngresoPorDefecto(condominiumId: string) {
  const supabase = await createClient();
  const { data: existentes, error } = await supabase
    .from("expense_items")
    .select("id")
    .eq("condominium_id", condominiumId)
    .eq("category", "ingreso")
    .limit(1);

  if (error) {
    console.error("Error verificando rubros de ingreso", error);
    return;
  }

  if ((existentes || []).length > 0) return;

  const payload = RUBROS_INGRESO_POR_DEFECTO.map((name) => ({
    condominium_id: condominiumId,
    name,
    description: null,
    category: "ingreso" as const,
    classification: "ordinario" as const,
    allocation_method: "aliquot",
    parent_id: null,
    is_active: true,
  }));

  const { error: insertError } = await supabase.from("expense_items").insert(payload);
  if (insertError) {
    console.error("No se pudieron crear los rubros de ingreso por defecto", insertError);
  }
}

export async function getContextoPresupuesto(
  condominiumId: string
): Promise<ContextoPresupuestoDetallado> {
  const supabase = await createClient();
  const contexto: ContextoPresupuestoDetallado = {
    activeBudgetMasterId: null,
    budgetType: null,
    year: null,
    rubrosPresupuestadosIds: [],
  };

  const { data: condo } = await supabase
    .from("condominiums")
    .select("active_budget_master_id")
    .eq("id", condominiumId)
    .single();

  if (!condo?.active_budget_master_id) return contexto;

  contexto.activeBudgetMasterId = condo.active_budget_master_id;

  const { data: budgetMaster } = await supabase
    .from("budgets_master")
    .select("id, budget_type, year")
    .eq("id", condo.active_budget_master_id)
    .maybeSingle();

  if (!budgetMaster) return contexto;

  contexto.budgetType = budgetMaster.budget_type as ContextoPresupuestoDetallado["budgetType"];
  contexto.year = budgetMaster.year;

  // Solo importa para presupuesto detallado: rubros padre de gasto ordinario
  if (budgetMaster.budget_type === "detallado") {
    const { data: rubrosPresupuestados, error } = await supabase
      .from("budgets")
      .select("expense_item_id")
      .eq("budgets_master_id", budgetMaster.id);

    if (error) {
      console.error("Error leyendo rubros del presupuesto activo", error);
      return contexto;
    }

    const set = new Set<string>();
    (rubrosPresupuestados || []).forEach((row) => {
      if (row.expense_item_id) set.add(row.expense_item_id);
    });
    contexto.rubrosPresupuestadosIds = Array.from(set);
  }

  return contexto;
}

export async function getRubrosPorCategoria(
  condominiumId: string,
  category: CategoriaRubro,
  contexto?: ContextoPresupuestoDetallado
): Promise<RubroConSubrubros[]> {
  if (category === "ingreso") {
    // Crear rubros base de ingresos si el condominio entra por primera vez
    await ensureRubrosIngresoPorDefecto(condominiumId);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_items")
    .select("*")
    .eq("condominium_id", condominiumId)
    .eq("category", category)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error listando rubros", error);
    return [];
  }

  const items: Rubro[] = data || [];
  const padres = items.filter((item) => !item.parent_id).sort((a, b) => a.name.localeCompare(b.name));
  const hijosPorPadre = new Map<string, Rubro[]>();

  items
    .filter((item) => !!item.parent_id)
    .forEach((child) => {
      const list = hijosPorPadre.get(child.parent_id!) || [];
      list.push(child);
      hijosPorPadre.set(child.parent_id!, list);
    });

  const setPresupuesto =
    contexto?.budgetType === "detallado" ? new Set(contexto.rubrosPresupuestadosIds) : null;

  return padres.map((padre) => ({
    padre: {
      ...padre,
      esta_presupuestado: setPresupuesto ? setPresupuesto.has(padre.id) : undefined,
      ano_presupuesto: contexto?.budgetType === "detallado" ? contexto?.year || null : null,
    },
    subrubros: (hijosPorPadre.get(padre.id) || []).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export async function crearRubroPadre(condominiumId: string, formData: FormData) {
  const categoryRaw = String(formData.get("category") || "").toLowerCase();
  const classificationRaw = String(formData.get("classification") || "").toLowerCase();
  const category: "gasto" | "ingreso" = categoryRaw === "gasto" || categoryRaw === "ingreso" ? categoryRaw : "ingreso";
  const classification: "ordinario" | "extraordinario" =
    classificationRaw === "extraordinario" ? "extraordinario" : "ordinario";

  const parsed = RubroPadreSchema.safeParse({
    name: normalize(formData.get("name")),
    description: normalize(formData.get("description")),
    category,
    classification,
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    const paths = parsed.error.issues.map((i) => i.path?.[0]);
    if (paths.includes("category") || paths.includes("classification")) {
      return {
        error:
          "Selecciona categoria y clasificacion (ingreso/gasto + ordinario/extraordinario). Para gastos ordinarios se validara en Presupuesto; para ingresos solo valida que esten seleccionados.",
      };
    }
    return { error: parsed.error.issues[0].message };
  }
  const payload = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("expense_items").insert({
    condominium_id: condominiumId,
    name: payload.name,
    description: payload.description || null,
    category: payload.category,
    classification: payload.classification,
    allocation_method: "aliquot",
    parent_id: null,
    is_active: payload.is_active,
  });

  if (error) {
    console.error("No se pudo crear el rubro", error);
    return { error: "No se pudo crear el rubro." };
  }

  revalidatePath(`/app/${condominiumId}/expense-items`);
  return { success: true };
}

export async function actualizarRubroPadre(
  condominiumId: string,
  rubroId: string,
  formData: FormData
) {
  const categoryRaw = String(formData.get("category") || "").toLowerCase();
  const classificationRaw = String(formData.get("classification") || "").toLowerCase();
  const category: "gasto" | "ingreso" = categoryRaw === "gasto" || categoryRaw === "ingreso" ? categoryRaw : "ingreso";
  const classification: "ordinario" | "extraordinario" =
    classificationRaw === "extraordinario" ? "extraordinario" : "ordinario";

  const parsed = RubroPadreSchema.safeParse({
    name: normalize(formData.get("name")),
    description: normalize(formData.get("description")),
    category,
    classification,
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  // Mantenemos category y classification originales para evitar cambios agresivos mientras
  // se define la regla final de uso en egresos/presupuesto.
  const { data: existente } = await supabase
    .from("expense_items")
    .select("category, classification")
    .eq("id", rubroId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!existente) return { error: "Rubro no encontrado" };

  const { error } = await supabase
    .from("expense_items")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      is_active: parsed.data.is_active,
      category: existente.category,
      classification: existente.classification,
    })
    .eq("id", rubroId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("No se pudo actualizar el rubro", error);
    return { error: "Error al actualizar el rubro." };
  }

  revalidatePath(`/app/${condominiumId}/expense-items`);
  return { success: true };
}

export async function crearSubrubro(condominiumId: string, formData: FormData) {
  const parsed = SubrubroSchema.safeParse({
    parent_id: formData.get("parent_id"),
    name: normalize(formData.get("name")),
    description: normalize(formData.get("description")),
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: padre } = await supabase
    .from("expense_items")
    .select("id, category, classification, condominium_id, parent_id")
    .eq("id", parsed.data.parent_id)
    .maybeSingle();

  if (!padre || padre.condominium_id !== condominiumId) {
    return { error: "Selecciona un rubro padre valido." };
  }
  if (padre.parent_id) {
    return { error: "Solo puedes elegir rubros padre como contenedor." };
  }

  const { error } = await supabase.from("expense_items").insert({
    condominium_id: condominiumId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    category: padre.category,
    classification: padre.classification,
    allocation_method: "aliquot",
    parent_id: padre.id,
    is_active: parsed.data.is_active,
  });

  if (error) {
    console.error("No se pudo crear el subrubro", error);
    return { error: "No se pudo crear el subrubro." };
  }

  revalidatePath(`/app/${condominiumId}/expense-items`);
  return { success: true };
}

export async function actualizarSubrubro(
  condominiumId: string,
  subrubroId: string,
  formData: FormData
) {
  const parsed = SubrubroSchema.safeParse({
    parent_id: formData.get("parent_id"),
    name: normalize(formData.get("name")),
    description: normalize(formData.get("description")),
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: padre } = await supabase
    .from("expense_items")
    .select("id, category, classification, condominium_id, parent_id")
    .eq("id", parsed.data.parent_id)
    .maybeSingle();

  if (!padre || padre.condominium_id !== condominiumId) {
    return { error: "Selecciona un rubro padre valido." };
  }
  if (padre.parent_id) {
    return { error: "Solo puedes elegir rubros padre como contenedor." };
  }

  const { error } = await supabase
    .from("expense_items")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      category: padre.category,
      classification: padre.classification,
      allocation_method: "aliquot",
      parent_id: padre.id,
      is_active: parsed.data.is_active,
    })
    .eq("id", subrubroId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("No se pudo actualizar el subrubro", error);
    return { error: "Error al actualizar el subrubro." };
  }

  revalidatePath(`/app/${condominiumId}/expense-items`);
  return { success: true };
}

export async function cambiarEstadoRubro(
  condominiumId: string,
  rubroId: string,
  nuevoEstado: boolean
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expense_items")
    .update({ is_active: nuevoEstado })
    .eq("id", rubroId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("No se pudo cambiar el estado del rubro", error);
    // Exponer mas detalle para depurar RLS/permisos
    const isRls = error.code === "42501";
    return {
      error: isRls
        ? "RLS/Permisos: el cambio de estado fue bloqueado. Revisa la politica de expense_items para este condominium_id."
        : error.message || "Error al actualizar estado.",
    };
  }

  revalidatePath(`/app/${condominiumId}/expense-items`);
  return { success: true };
}

export async function eliminarRubro(condominiumId: string, rubroId: string) {
  const supabase = await createClient();
  const { data: rubro, error: fetchError } = await supabase
    .from("expense_items")
    .select("id, parent_id, category, classification")
    .eq("id", rubroId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (fetchError || !rubro) return { error: "Rubro no encontrado." };

  // Bloqueo basico: si es rubro padre de gasto ordinario presupuesta, no eliminar
  if (!rubro.parent_id && rubro.category === "gasto" && rubro.classification === "ordinario") {
    const { data: condo } = await supabase
      .from("condominiums")
      .select("active_budget_master_id")
      .eq("id", condominiumId)
      .single();

    if (condo?.active_budget_master_id) {
      const { data: budgetMaster } = await supabase
        .from("budgets_master")
        .select("id, budget_type")
        .eq("id", condo.active_budget_master_id)
        .maybeSingle();

      if (budgetMaster?.budget_type === "detallado") {
        const { data: usoPresupuesto } = await supabase
          .from("budgets")
          .select("id")
          .eq("budgets_master_id", budgetMaster.id)
          .eq("expense_item_id", rubro.id)
          .limit(1);

        if ((usoPresupuesto || []).length > 0) {
          return {
            error:
              "No puedes eliminar un rubro de gasto ordinario que esta en el presupuesto detallado activo. Editalo desde Presupuesto.",
          };
        }
      }
    }
  }

  // Si es padre, borrar primero subrubros para evitar FK
  if (!rubro.parent_id) {
    await supabase.from("expense_items").delete().eq("parent_id", rubro.id);
  }

  const { error } = await supabase.from("expense_items").delete().eq("id", rubro.id);
  if (error) {
    console.error("No se pudo eliminar el rubro", error);
    return { error: "Error al eliminar el rubro." };
  }

  revalidatePath(`/app/${condominiumId}/expense-items`);
  return { success: true };
}

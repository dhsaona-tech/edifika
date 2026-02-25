"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CategoriaRubro,
  ContextoPresupuestoDetallado,
  Rubro,
  RubroConSubrubros,
  RubroSource,
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

/**
 * Verifica si hay un presupuesto detallado activo
 */
export async function hayPresupuestoDetalladoActivo(condominiumId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: condo } = await supabase
    .from("condominiums")
    .select("active_budget_master_id")
    .eq("id", condominiumId)
    .single();

  if (!condo?.active_budget_master_id) return false;

  const { data: budget } = await supabase
    .from("budgets_master")
    .select("budget_type")
    .eq("id", condo.active_budget_master_id)
    .maybeSingle();

  return budget?.budget_type === "detallado";
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

  // NUEVA VALIDACIÓN: Si hay presupuesto detallado activo y es gasto ordinario, bloquear
  if (payload.category === "gasto" && payload.classification === "ordinario") {
    const tienePresupuestoActivo = await hayPresupuestoDetalladoActivo(condominiumId);
    if (tienePresupuestoActivo) {
      return {
        error:
          "Los rubros de gasto ordinario se heredan automáticamente del presupuesto. Si necesitas agregar un gasto no contemplado en el presupuesto, créalo como extraordinario.",
      };
    }
  }

  // VALIDACIÓN: Unicidad de nombre dentro del mismo condominio, categoría y nivel padre
  const { data: duplicado } = await supabase
    .from("expense_items")
    .select("id")
    .eq("condominium_id", condominiumId)
    .eq("category", payload.category)
    .ilike("name", payload.name)
    .is("parent_id", null)
    .limit(1);

  if ((duplicado || []).length > 0) {
    return { error: `Ya existe un rubro "${payload.name}" en esta categoría.` };
  }

  const { error } = await supabase.from("expense_items").insert({
    condominium_id: condominiumId,
    name: payload.name,
    description: payload.description || null,
    category: payload.category,
    classification: payload.classification,
    allocation_method: "aliquot",
    parent_id: null,
    is_active: payload.is_active,
    source: "manual" as RubroSource,
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

  // VALIDACIÓN: Si es gasto ordinario en presupuesto activo, no permitir desactivar
  if (
    !parsed.data.is_active &&
    existente.category === "gasto" &&
    existente.classification === "ordinario"
  ) {
    const { data: condo } = await supabase
      .from("condominiums")
      .select("active_budget_master_id")
      .eq("id", condominiumId)
      .single();

    if (condo?.active_budget_master_id) {
      const { data: enPresupuesto } = await supabase
        .from("budgets")
        .select("id")
        .eq("budgets_master_id", condo.active_budget_master_id)
        .eq("expense_item_id", rubroId)
        .limit(1);

      if ((enPresupuesto || []).length > 0) {
        return {
          error:
            "No puedes desactivar un rubro de gasto ordinario que está en el presupuesto activo. Edítalo desde Presupuesto.",
        };
      }
    }
  }

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

  // VALIDACIÓN: Unicidad de nombre dentro del mismo rubro padre
  const { data: duplicado } = await supabase
    .from("expense_items")
    .select("id")
    .eq("condominium_id", condominiumId)
    .eq("parent_id", padre.id)
    .ilike("name", parsed.data.name)
    .limit(1);

  if ((duplicado || []).length > 0) {
    return { error: `Ya existe un subrubro "${parsed.data.name}" en este rubro.` };
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

  // Obtener datos del rubro para validaciones
  const { data: rubro } = await supabase
    .from("expense_items")
    .select("id, parent_id, category, classification")
    .eq("id", rubroId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!rubro) return { error: "Rubro no encontrado." };

  // VALIDACIÓN: Si se desactiva un gasto ordinario en presupuesto activo, bloquear
  if (!nuevoEstado && rubro.category === "gasto" && rubro.classification === "ordinario") {
    const { data: condo } = await supabase
      .from("condominiums")
      .select("active_budget_master_id")
      .eq("id", condominiumId)
      .single();

    if (condo?.active_budget_master_id) {
      // Verificar si este rubro (o su padre) está en el presupuesto
      const idToCheck = rubro.parent_id || rubro.id;
      const { data: enPresupuesto } = await supabase
        .from("budgets")
        .select("id")
        .eq("budgets_master_id", condo.active_budget_master_id)
        .eq("expense_item_id", idToCheck)
        .limit(1);

      if ((enPresupuesto || []).length > 0) {
        return {
          error:
            "No puedes desactivar un rubro vinculado al presupuesto activo. Edítalo desde Presupuesto.",
        };
      }
    }
  }

  // CASCADA: Si es rubro padre y se desactiva, desactivar también subrubros
  if (!nuevoEstado && !rubro.parent_id) {
    await supabase
      .from("expense_items")
      .update({ is_active: false })
      .eq("parent_id", rubroId)
      .eq("condominium_id", condominiumId);
  }

  // CASCADA: Si es rubro padre y se reactiva, reactivar también subrubros
  if (nuevoEstado && !rubro.parent_id) {
    await supabase
      .from("expense_items")
      .update({ is_active: true })
      .eq("parent_id", rubroId)
      .eq("condominium_id", condominiumId);
  }

  const { error } = await supabase
    .from("expense_items")
    .update({ is_active: nuevoEstado })
    .eq("id", rubroId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("No se pudo cambiar el estado del rubro", error);
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
    .select("id, parent_id, category, classification, source, source_project_id")
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

  // Verificar si el rubro tiene egresos asociados
  const { data: egresosAsociados } = await supabase
    .from("payable_orders")
    .select("id")
    .eq("expense_item_id", rubroId)
    .limit(1);

  if ((egresosAsociados || []).length > 0) {
    return {
      error: "No puedes eliminar este rubro porque tiene egresos asociados. Puedes desactivarlo en su lugar.",
    };
  }

  // Verificar si el rubro tiene proyectos asociados (aparte del que lo creó)
  const { data: proyectosAsociados } = await supabase
    .from("extraordinary_plans")
    .select("id")
    .eq("expense_item_id", rubroId)
    .neq("id", rubro.source_project_id || "")
    .limit(1);

  if ((proyectosAsociados || []).length > 0) {
    return {
      error: "No puedes eliminar este rubro porque tiene otros proyectos asociados.",
    };
  }

  // SOFT DELETE: desactivar en lugar de eliminar físicamente
  // Si es padre, desactivar también los subrubros
  if (!rubro.parent_id) {
    await supabase
      .from("expense_items")
      .update({ is_active: false })
      .eq("parent_id", rubro.id)
      .eq("condominium_id", condominiumId);
  }

  const { error } = await supabase
    .from("expense_items")
    .update({ is_active: false })
    .eq("id", rubro.id)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("No se pudo eliminar el rubro", error);
    return { error: "Error al eliminar el rubro." };
  }

  revalidatePath(`/app/${condominiumId}/expense-items`);
  return { success: true };
}

/**
 * Obtiene rubros extraordinarios de gasto para usar en Proyectos
 */
export async function getRubrosExtraordinarios(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_items")
    .select("id, name, description")
    .eq("condominium_id", condominiumId)
    .eq("category", "gasto")
    .eq("classification", "extraordinario")
    .eq("is_active", true)
    .is("parent_id", null)
    .order("name");

  if (error) {
    console.error("Error obteniendo rubros extraordinarios", error);
    return [];
  }

  return data || [];
}

/**
 * Crea un rubro extraordinario desde un proyecto
 */
export async function crearRubroDesdeProyecto(
  condominiumId: string,
  projectId: string,
  name: string,
  description?: string | null
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expense_items")
    .insert({
      condominium_id: condominiumId,
      name,
      description: description || null,
      category: "gasto",
      classification: "extraordinario",
      allocation_method: "aliquot",
      parent_id: null,
      is_active: true,
      source: "project" as RubroSource,
      source_project_id: projectId,
    })
    .select("id, name")
    .single();

  if (error || !data) {
    console.error("Error creando rubro desde proyecto", error);
    return { error: "No se pudo crear el rubro para el proyecto." };
  }

  revalidatePath(`/app/${condominiumId}/expense-items`);
  return { success: true, rubro: data };
}

/**
 * Elimina un rubro que fue creado por un proyecto (solo si no tiene otros usos)
 */
export async function eliminarRubroDeProyecto(condominiumId: string, rubroId: string, projectId: string) {
  const supabase = await createClient();

  // Verificar que el rubro existe y fue creado por este proyecto
  const { data: rubro } = await supabase
    .from("expense_items")
    .select("id, source, source_project_id")
    .eq("id", rubroId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!rubro) return { error: "Rubro no encontrado." };

  // Si no fue creado por este proyecto, no eliminarlo
  if (rubro.source !== "project" || rubro.source_project_id !== projectId) {
    return { skipped: true, message: "Rubro no fue creado por este proyecto, se mantiene." };
  }

  // Verificar si tiene egresos
  const { data: egresos } = await supabase
    .from("payable_orders")
    .select("id")
    .eq("expense_item_id", rubroId)
    .limit(1);

  if ((egresos || []).length > 0) {
    // No eliminar, solo desactivar
    await supabase
      .from("expense_items")
      .update({ is_active: false })
      .eq("id", rubroId);
    return { success: true, message: "Rubro tiene egresos, se desactivó en lugar de eliminar." };
  }

  // Verificar si tiene otros proyectos
  const { data: otrosProyectos } = await supabase
    .from("extraordinary_plans")
    .select("id")
    .eq("expense_item_id", rubroId)
    .neq("id", projectId)
    .limit(1);

  if ((otrosProyectos || []).length > 0) {
    return { success: true, message: "Rubro usado por otros proyectos, se mantiene." };
  }

  // SOFT DELETE: desactivar subrubros y rubro
  await supabase
    .from("expense_items")
    .update({ is_active: false })
    .eq("parent_id", rubroId)
    .eq("condominium_id", condominiumId);

  await supabase
    .from("expense_items")
    .update({ is_active: false })
    .eq("id", rubroId)
    .eq("condominium_id", condominiumId);

  revalidatePath(`/app/${condominiumId}/expense-items`);
  return { success: true, message: "Rubro desactivado." };
}

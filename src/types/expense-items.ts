export type CategoriaRubro = "gasto" | "ingreso";
export type ClasificacionRubro = "ordinario" | "extraordinario";

// Origen del rubro: creado desde presupuesto o manualmente
export type RubroSource = "budget" | "manual" | "project";

export type Rubro = {
  id: string;
  created_at?: string;
  condominium_id: string;
  name: string;
  description: string | null;
  category: CategoriaRubro;
  classification: ClasificacionRubro;
  allocation_method: string;
  is_active: boolean;
  parent_id: string | null;
  // Nuevos campos para control de origen y archivado
  source?: RubroSource; // De dónde vino el rubro
  source_budget_id?: string | null; // ID del presupuesto que lo creó (si aplica)
  source_project_id?: string | null; // ID del proyecto que lo creó (si aplica)
  is_archived?: boolean; // Archivado (para rubros de presupuestos anteriores)
  archived_at?: string | null;
};

export type RubroConSubrubros = {
  padre: Rubro & {
    // Para gastos con presupuesto detallado mostramos si el rubro padre esta en el master activo
    esta_presupuestado?: boolean;
    ano_presupuesto?: number | null;
  };
  subrubros: Rubro[];
};

export type ContextoPresupuestoDetallado = {
  activeBudgetMasterId: string | null;
  budgetType: "global" | "detallado" | null;
  year: number | null;
  rubrosPresupuestadosIds: string[];
};

// Nota de negocio:
// - Los subrubros no tienen presupuesto propio; heredan category y classification de su padre.
// - En presupuesto detallado solo los rubros padre de gasto ordinario se presupuesta y se usan para egresos ordinarios.

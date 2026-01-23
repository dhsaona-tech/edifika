export type CategoriaRubro = "gasto" | "ingreso";
export type ClasificacionRubro = "ordinario" | "extraordinario";

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

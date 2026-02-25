export type BudgetType = "global" | "detallado";
export type BudgetStatus = "borrador" | "aprobado" | "inactivo";
export type DistributionMethod = "por_aliquota" | "igualitario" | "manual_por_unidad";

export type BudgetMaster = {
  id: string;
  created_at: string;
  condominium_id: string;
  name: string;
  year: number;
  budget_type: BudgetType;
  total_annual_amount: number;
  status: BudgetStatus;
  distribution_method: DistributionMethod | null;
  // Nuevos campos para versionamiento
  version?: number; // Número de versión (1, 2, 3...)
  effective_from?: string; // Fecha desde la cual aplica (YYYY-MM-DD)
  effective_to?: string | null; // Fecha hasta la cual aplicó (null si es el activo)
  change_reason?: string | null; // Motivo del cambio (obligatorio si es modificación)
  previous_version_id?: string | null; // ID de la versión anterior
  modified_by?: string | null; // ID del usuario que hizo el cambio
  modified_at?: string | null; // Fecha del cambio
};

// Historial de versiones para auditoría
export type BudgetVersionHistory = {
  id: string;
  budget_master_id: string;
  version: number;
  effective_from: string;
  effective_to: string | null;
  change_reason: string | null;
  total_annual_amount: number;
  modified_by: string | null;
  modified_at: string;
  snapshot_data: string; // JSON con los datos del presupuesto en ese momento
};

export type BudgetLine = {
  id: string;
  created_at: string;
  condominium_id: string;
  expense_item_id: string;
  period: string;
  amount: number;
  budgets_master_id: string | null;
};

export type ExpenseItemResumen = {
  id: string;
  name: string;
  annual_amount: number;
  monthly_amount: number;
};

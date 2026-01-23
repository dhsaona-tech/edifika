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

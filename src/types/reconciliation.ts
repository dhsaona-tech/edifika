export type Reconciliation = {
  id: string;
  condominium_id: string;
  financial_account_id: string;
  cutoff_date: string; // Fecha de corte
  period_start: string; // Primer día del período
  period_end: string; // Último día del período
  opening_balance: number; // Saldo inicial
  closing_balance_bank: number; // Saldo según banco
  closing_balance_calculated: number; // Saldo calculado
  difference: number; // Diferencia (banco - calculado)
  status: "borrador" | "conciliada" | "cerrada";
  reconciled_at: string | null;
  reconciled_by: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type ReconciliationItem = {
  id: string;
  reconciliation_id: string;
  payment_id: string | null; // Si es ingreso
  egress_id: string | null; // Si es egreso
  check_id: string | null; // Si el egreso tiene cheque
  is_check_cashed: boolean; // Si el cheque ya fue cobrado
  transaction_date: string;
  transaction_type: "ingreso" | "egreso";
  amount: number;
  description: string | null;
  reference_number: string | null;
  created_at: string;
};

export type ReconciliationPayment = {
  id: string;
  folio_rec: number | null;
  payment_date: string;
  total_amount: number;
  payment_method: string | null;
  reference_number: string | null;
  unit?: { full_identifier?: string | null; identifier?: string | null } | null;
  payer?: { full_name?: string | null } | null;
  financial_account?: { bank_name?: string | null; account_number?: string | null } | null;
};

export type ReconciliationEgress = {
  id: string;
  folio_eg: number | null;
  payment_date: string;
  total_amount: number;
  payment_method: string | null;
  reference_number: string | null;
  supplier?: { name?: string | null } | null;
  check?: { id?: string | null; check_number?: number | null; status?: string | null } | null;
  financial_account?: { bank_name?: string | null; account_number?: string | null } | null;
};

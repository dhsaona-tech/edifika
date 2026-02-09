export type AccountType = "corriente" | "ahorros" | "caja_chica";
export type CheckStatus = "disponible" | "usado" | "anulado" | "perdido";

export type FinancialAccount = {
  id: string;
  created_at: string;
  condominium_id: string;
  bank_name: string;
  account_number: string;
  account_type: AccountType;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  uses_checks: boolean;
};

export type Checkbook = {
  id: string;
  created_at: string;
  financial_account_id: string;
  start_number: number;
  end_number: number;
  current_number: number | null;
  is_active: boolean;
  notes: string | null;
};

export type Check = {
  id: string;
  created_at: string;
  financial_account_id: string;
  checkbook_id: string | null;
  check_number: number;
  status: CheckStatus;
  egress_id: string | null;
  issue_date: string | null;
  notes: string | null;
};

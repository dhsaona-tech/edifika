export type ChargeStatus = "pendiente" | "pagado" | "cancelado";
export type ChargeType =
  | "expensa_mensual"
  | "servicio_basico"
  | "extraordinaria_masiva"
  | "saldo_inicial"
  | "multa"
  | "reserva"
  | "otro";

export type Charge = {
  id: string;
  created_at: string;
  condominium_id: string;
  unit_id: string;
  expense_item_id: string;
  utility_bill_id: string | null;
  batch_id: string | null;
  period: string | null;
  posted_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: ChargeStatus;
  charge_type: ChargeType;
  description: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by_profile_id: string | null;
  unit?: { identifier?: string | null; full_identifier?: string | null } | null;
  expense_item?: { name: string } | null;
};

export type ChargeBatchType =
  | "expensas_mensuales"
  | "servicio_basico"
  | "extraordinaria_masiva"
  | "saldo_inicial";

export type ChargeBatch = {
  id: string;
  created_at: string;
  condominium_id: string;
  type: ChargeBatchType;
  expense_item_id: string;
  period: string;
  posted_date: string;
  due_date: string;
  description: string | null;
};

export type UnitChargePreview = {
  unit_id: string;
  unit_name: string;
  aliquot?: number | null;
  contact_name?: string | null;
  include: boolean;
  suggested_amount: number;
  final_amount: number;
  detail?: string;
  consumption?: number;
};

export type UtilityBillMode = "meter_based" | "allocation";
export type UtilityBillStatus = "draft" | "closed" | "billed";

export interface UtilityBillLineItem {
  description: string;
  amount: number;
}

export interface UtilityBill {
  id: string;
  condominium_id: string;
  expense_item_id: string;
  mode: UtilityBillMode;
  unit_of_measure: string | null;
  period: string;
  total_matrix_consumption: number | null;
  total_amount: number;
  average_unit_cost: number | null;
  communal_consumption: number | null;
  allocation_method: "por_aliquota" | "igualitario" | null;
  status: UtilityBillStatus;
  invoice_number: string | null;
  invoice_date: string | null;
  line_items: UtilityBillLineItem[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joins opcionales
  expense_item?: { name: string } | null;
}

export interface UtilityReading {
  id: string;
  utility_bill_id: string;
  unit_id: string;
  previous_reading: number;
  current_reading: number;
  consumption: number;
  calculated_amount: number;
  charge_id: string | null;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  unit?: {
    identifier?: string | null;
    full_identifier?: string | null;
    block_identifier?: string | null;
  } | null;
  charge?: { status?: string } | null;
}

export interface UtilityBillWithReadings extends UtilityBill {
  utility_readings: UtilityReading[];
}

// src/types/billing.ts
// Tipos para el motor de facturación EDIFIKA

// ============================================================================
// CONFIGURACIÓN DE FACTURACIÓN
// ============================================================================

export type EarlyPaymentType = "porcentaje" | "monto_fijo";
export type LateFeeType = "porcentaje" | "monto_fijo";
export type LateFeeApplyOn = "balance" | "total";

export interface CondominiumBillingSettings {
  id: string;
  condominium_id: string;

  // Pronto Pago
  early_payment_enabled: boolean;
  early_payment_type: EarlyPaymentType | null;
  early_payment_value: number;
  early_payment_cutoff_day: number | null;

  // Mora
  late_fee_enabled: boolean;
  late_fee_type: LateFeeType | null;
  late_fee_value: number;
  late_fee_grace_days: number;
  late_fee_apply_on: LateFeeApplyOn;
  late_fee_max_rate: number | null;
  late_fee_compound: boolean;

  // General
  default_due_day: number;
  auto_generate_charges: boolean;

  // Auditoría
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

// ============================================================================
// EXTENSIONES A CHARGES
// ============================================================================

// Nuevos tipos de cargo
export type ExtendedChargeType =
  | "expensa_mensual"
  | "servicio_basico"
  | "extraordinaria_masiva"
  | "saldo_inicial"
  | "multa"
  | "reserva"
  | "otro"
  | "interest" // Cargo de mora
  | "extraordinary_installment"; // Cuota de plan extraordinario

export interface ChargeEarlyPaymentInfo {
  early_payment_eligible: boolean;
  early_payment_amount: number;
  early_payment_deadline: string | null;
  early_payment_applied: boolean;
  early_payment_applied_at: string | null;
}

export interface ChargeLateFeeInfo {
  late_fee_eligible: boolean;
  late_fee_exemption_reason: string | null;
  parent_charge_id: string | null; // Para cargos de interés
}

export interface ChargeInstallmentInfo {
  extraordinary_plan_id: string | null;
  installment_number: number | null;
  total_installments: number | null;
}

// Cargo extendido con toda la info del motor de facturación
export interface ExtendedCharge {
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
  status: "pendiente" | "pagado" | "cancelado";
  charge_type: ExtendedChargeType;
  description: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by_profile_id: string | null;

  // Pronto pago
  early_payment_eligible: boolean;
  early_payment_amount: number;
  early_payment_deadline: string | null;
  early_payment_applied: boolean;
  early_payment_applied_at: string | null;

  // Mora
  late_fee_eligible: boolean;
  late_fee_exemption_reason: string | null;
  parent_charge_id: string | null;

  // Cuotas diferidas
  extraordinary_plan_id: string | null;
  installment_number: number | null;
  total_installments: number | null;

  // Relaciones opcionales
  unit?: { identifier?: string | null; full_identifier?: string | null } | null;
  expense_item?: { name: string } | null;
  parent_charge?: ExtendedCharge | null;
}

// ============================================================================
// PLANES EXTRAORDINARIOS
// ============================================================================

export type ExtraordinaryPlanDistribution = "por_aliquota" | "igualitario" | "manual";
export type ExtraordinaryPlanStatus = "borrador" | "activo" | "completado" | "cancelado";

export interface ExtraordinaryPlan {
  id: string;
  condominium_id: string;
  name: string;
  description: string | null;
  expense_item_id: string;
  distribution_method: ExtraordinaryPlanDistribution;
  total_amount: number;
  total_installments: number;
  start_period: string;
  status: ExtraordinaryPlanStatus;

  // Auditoría
  created_at: string;
  created_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;

  // Relaciones opcionales
  expense_item?: { name: string } | null;
}

export interface ExtraordinaryPlanUnit {
  id: string;
  extraordinary_plan_id: string;
  unit_id: string;
  total_amount: number;
  installment_amount: number;

  // Relaciones opcionales
  unit?: { identifier?: string | null; full_identifier?: string | null } | null;
}

// ============================================================================
// CONVENIOS DE PAGO
// ============================================================================

export type PaymentAgreementStatus = "activo" | "completado" | "incumplido" | "cancelado";
export type PaymentAgreementInstallmentStatus = "pendiente" | "pagado" | "vencido";

export interface PaymentAgreement {
  id: string;
  condominium_id: string;
  unit_id: string;

  // Términos
  original_debt_amount: number;
  total_amount: number;
  down_payment: number;
  remaining_amount: number;
  installments: number;
  installment_amount: number;

  // Fechas
  start_date: string;
  end_date: string;

  // Estado
  status: PaymentAgreementStatus;
  freeze_late_fees: boolean;

  // Auditoría
  notes: string | null;
  created_at: string;
  created_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;

  // Relaciones opcionales
  unit?: { identifier?: string | null; full_identifier?: string | null } | null;
}

export interface PaymentAgreementCharge {
  id: string;
  payment_agreement_id: string;
  charge_id: string;
  original_balance: number;

  // Relaciones opcionales
  charge?: ExtendedCharge | null;
}

export interface PaymentAgreementInstallment {
  id: string;
  payment_agreement_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  charge_id: string | null;
  status: PaymentAgreementInstallmentStatus;

  // Relaciones opcionales
  charge?: ExtendedCharge | null;
}

// ============================================================================
// CRÉDITOS / SALDOS A FAVOR (LEDGER)
// ============================================================================

export type UnitCreditMovementType =
  | "credit_in" // Ingreso de crédito (pago excedente, ajuste positivo)
  | "credit_out" // Uso de crédito (aplicado a cargo)
  | "adjustment" // Ajuste manual
  | "reversal"; // Reversión

export interface UnitCredit {
  id: string;
  condominium_id: string;
  unit_id: string;
  movement_type: UnitCreditMovementType;
  amount: number; // Positivo para credit_in, negativo para credit_out
  running_balance: number;
  payment_id: string | null;
  charge_id: string | null;
  payment_allocation_id: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;

  // Relaciones opcionales
  payment?: { folio_rec?: number | null } | null;
  charge?: { description?: string | null } | null;
}

// Extensión de Unit con credit_balance
export interface UnitWithCredit {
  id: string;
  condominium_id: string;
  identifier: string;
  full_identifier: string | null;
  credit_balance: number;
  // ... otros campos de Unit
}

// ============================================================================
// VISTAS Y RESÚMENES
// ============================================================================

export interface UnitAccountSummary {
  unit_id: string;
  condominium_id: string;
  identifier: string;
  full_identifier: string | null;
  credit_balance: number;
  total_pending: number;
  total_interest: number;
  total_overdue: number;
  potential_early_discount: number;
  net_balance: number;
  has_active_agreement: boolean;
}

// ============================================================================
// DTOs PARA FORMULARIOS
// ============================================================================

export interface BillingSettingsFormData {
  early_payment_enabled: boolean;
  early_payment_type: EarlyPaymentType;
  early_payment_value: number;
  early_payment_cutoff_day: number;

  late_fee_enabled: boolean;
  late_fee_type: LateFeeType;
  late_fee_value: number;
  late_fee_grace_days: number;
  late_fee_apply_on: LateFeeApplyOn;
  late_fee_max_rate: number | null;
  late_fee_compound: boolean;

  default_due_day: number;
  auto_generate_charges: boolean;
}

export interface ExtraordinaryPlanFormData {
  name: string;
  description: string;
  expense_item_id: string;
  distribution_method: ExtraordinaryPlanDistribution;
  total_amount: number;
  total_installments: number;
  start_period: string;
  // Para distribución manual
  unit_amounts?: Array<{
    unit_id: string;
    total_amount: number;
  }>;
}

export interface PaymentAgreementFormData {
  unit_id: string;
  charge_ids: string[];
  down_payment: number;
  installments: number;
  start_date: string;
  freeze_late_fees: boolean;
  notes?: string;
}

// ============================================================================
// RESPUESTAS DE RPC
// ============================================================================

export interface EarlyPaymentEligibilityResult {
  eligible: boolean;
  reason: string;
  discount_amount: number;
}

export interface ApplyEarlyPaymentResult {
  success: boolean;
  message: string;
  total_discount: number;
}

export interface GenerateLateFeeResult {
  charges_created: number;
  total_late_fees: number;
}

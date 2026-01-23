import { z } from "zod";

export const paymentMethodOptions = [
  "transferencia",
  "deposito",
  "efectivo",
  "cheque",
  "tarjeta",
  "otros",
] as const;

export const allocationSchema = z.object({
  charge_id: z.string().uuid(),
  amount_allocated: z.number().positive(),
  charge_balance: z.number().nonnegative(),
});

export const paymentGeneralSchema = z.object({
  condominium_id: z.string().uuid(),
  financial_account_id: z.string().uuid(),
  payment_date: z.string(),
  total_amount: z.number().positive(),
  payment_method: z.enum(paymentMethodOptions),
  reference_number: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  payer_profile_id: z.string().uuid().optional(),
});

export const paymentApplyChargesSchema = z.object({
  unit_id: z.string().uuid(),
  allocations: z.array(allocationSchema),
  allow_unassigned: z.boolean().default(true),
  expense_item_id_for_remainder: z.string().uuid().optional(),
});

export const paymentDirectSchema = z.object({
  expense_item_id: z.string().uuid(),
  unit_id: z.string().uuid().optional(),
});

export type PaymentGeneralInput = z.infer<typeof paymentGeneralSchema>;
export type PaymentApplyChargesInput = z.infer<typeof paymentApplyChargesSchema>;
export type PaymentDirectInput = z.infer<typeof paymentDirectSchema>;
export type PaymentAllocationInput = z.infer<typeof allocationSchema>;

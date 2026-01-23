import { z } from "zod";

export const payableStatusOptions = ["borrador", "pendiente_pago", "parcialmente_pagado", "pagado", "anulado"] as const;

export const payableGeneralSchema = z.object({
  condominium_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  expense_item_id: z.string().uuid(),
  issue_date: z.string().min(1),
  due_date: z.string().min(1),
  total_amount: z.coerce.number().positive(),
  invoice_number: z.string().min(1),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  planned_payment_method: z.string().optional().nullable(),
});

export type PayableGeneralInput = z.infer<typeof payableGeneralSchema>;

export const payableFiltersSchema = z
  .object({
    status: z.enum(["borrador", "pendiente_pago", "parcialmente_pagado", "pagado", "anulado"]).optional(),
    supplierId: z.string().uuid().optional(),
    expenseItemId: z.string().uuid().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    search: z.string().optional(),
  })
  .partial();

export type PayableFilters = z.infer<typeof payableFiltersSchema>;

export const egressPaymentSchema = z.object({
  condominium_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  financial_account_id: z.string().uuid(),
  payment_method: z.string().min(1),
  payment_date: z.string().min(1),
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  payables: z
    .array(
      z.object({
        payable_order_id: z.string().uuid(),
        amount: z.coerce.number().positive(),
      })
    )
    .min(1),
});

export type EgressPaymentInput = z.infer<typeof egressPaymentSchema>;

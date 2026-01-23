import { z } from "zod";

export const reconciliationSchema = z.object({
  financial_account_id: z.string().uuid(),
  cutoff_date: z.string().min(1, "Fecha de corte requerida"), // Fecha de corte
  closing_balance_bank: z.coerce.number(), // Saldo del banco
  notes: z.string().min(1, "Detalle de la conciliación requerido"), // Nombre/Detalle (ej: "Enero 2026")
  // period_start y period_end se calcularán automáticamente
  period_start: z.string().optional(), // Se calculará desde la última conciliación
  period_end: z.string().optional(), // Será igual a cutoff_date
});

export const reconciliationItemsSchema = z.object({
  reconciliation_id: z.string().uuid(),
  selected_payments: z.array(z.string().uuid()),
  selected_egresses: z.array(
    z.object({
      egress_id: z.string().uuid(),
      check_id: z.string().uuid().nullable(),
      is_check_cashed: z.boolean(),
    })
  ),
});

export type ReconciliationInput = z.infer<typeof reconciliationSchema>;
export type ReconciliationItemsInput = z.infer<typeof reconciliationItemsSchema>;

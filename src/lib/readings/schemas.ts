import { z } from "zod";

// ============================================================
// Crear cabecera de lectura (utility_bill)
// ============================================================
export const createUtilityBillSchema = z
  .object({
    condominium_id: z.string().uuid(),
    expense_item_id: z.string().uuid(),
    mode: z.enum(["meter_based", "allocation"]),
    unit_of_measure: z.string().min(1).optional(),
    period: z.string().regex(/^\d{4}-\d{2}-01$/, "Formato de periodo inválido (YYYY-MM-01)"),
    total_matrix_consumption: z.coerce.number().positive().optional(),
    total_amount: z.coerce.number().positive("El monto total debe ser mayor a 0"),
    allocation_method: z.enum(["por_aliquota", "igualitario"]).optional(),
    invoice_number: z.string().optional(),
    invoice_date: z.string().optional(),
    line_items: z
      .array(
        z.object({
          description: z.string().min(1),
          amount: z.coerce.number(),
        })
      )
      .optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) =>
      data.mode !== "meter_based" ||
      (data.unit_of_measure && data.total_matrix_consumption && data.total_matrix_consumption > 0),
    { message: "Para modo medidor, la unidad de medida y el consumo matriz son requeridos." }
  )
  .refine((data) => data.mode !== "allocation" || data.allocation_method, {
    message: "Para modo distribución, el método de asignación es requerido.",
  });

// ============================================================
// Actualizar cabecera (solo en draft)
// ============================================================
export const updateBillHeaderSchema = z.object({
  total_matrix_consumption: z.coerce.number().positive().optional(),
  total_amount: z.coerce.number().positive().optional(),
  unit_of_measure: z.string().min(1).optional(),
  allocation_method: z.enum(["por_aliquota", "igualitario"]).optional(),
  invoice_number: z.string().optional(),
  invoice_date: z.string().optional(),
  line_items: z
    .array(
      z.object({
        description: z.string().min(1),
        amount: z.coerce.number(),
      })
    )
    .optional(),
  notes: z.string().optional(),
});

// ============================================================
// Guardar lecturas (bulk upsert, solo en draft)
// ============================================================
export const saveReadingsSchema = z.object({
  utility_bill_id: z.string().uuid(),
  readings: z.array(
    z.object({
      unit_id: z.string().uuid(),
      current_reading: z.coerce.number().min(0, "La lectura no puede ser negativa"),
    })
  ),
});

export type CreateUtilityBillInput = z.infer<typeof createUtilityBillSchema>;
export type UpdateBillHeaderInput = z.infer<typeof updateBillHeaderSchema>;
export type SaveReadingsInput = z.infer<typeof saveReadingsSchema>;

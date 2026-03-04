import { z } from "zod";

// ==========================================
// AMENITY SCHEMAS
// ==========================================

export const amenitySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional().or(z.literal("")),
  photo_url: z.string().optional().or(z.literal("")),
  max_capacity: z.coerce.number().int().min(1, "Capacidad mínima es 1"),

  // Reglas de aprobación
  requires_approval: z.boolean().default(false),
  cancelation_cutoff_hours: z.coerce.number().int().min(0).default(24),

  // Reglas financieras
  is_rentable: z.boolean().default(false),
  rental_cost: z.coerce.number().nonnegative().default(0),
  requires_guarantee: z.boolean().default(false),
  guarantee_amount: z.coerce.number().nonnegative().default(0),
  expense_item_id: z.string().uuid().optional().or(z.literal("")),

  // Reglas de cartera
  allow_debtors: z.boolean().default(true),
  debt_grace_day: z.coerce.number().int().min(1).max(28).default(10),
});

export type AmenityInput = z.infer<typeof amenitySchema>;

// ==========================================
// BOOKING SCHEMAS
// ==========================================

export const createBookingSchema = z.object({
  amenity_id: z.string().uuid("Debe seleccionar un área"),
  unit_id: z.string().uuid("Debe seleccionar una unidad"),
  start_time: z.string().min(1, "La fecha/hora de inicio es requerida"),
  end_time: z.string().min(1, "La fecha/hora de fin es requerida"),
  notes: z.string().optional().or(z.literal("")),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const resolveGuaranteeSchema = z
  .object({
    booking_id: z.string().uuid(),
    resolution: z.enum(["applied_to_balance", "refunded_externally"]),
    financial_account_id: z.string().uuid().optional(),
  })
  .refine(
    (data) =>
      data.resolution !== "refunded_externally" || !!data.financial_account_id,
    {
      message: "Debe seleccionar una cuenta para la devolución",
      path: ["financial_account_id"],
    }
  );

export type ResolveGuaranteeInput = z.infer<typeof resolveGuaranteeSchema>;

// ==========================================
// FILTER SCHEMAS
// ==========================================

export const bookingFiltersSchema = z.object({
  amenity_id: z.string().uuid().optional(),
  status: z
    .enum(["pending_approval", "confirmed", "canceled", "completed"])
    .optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export type BookingFilters = z.infer<typeof bookingFiltersSchema>;

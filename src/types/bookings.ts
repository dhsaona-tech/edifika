// ==========================================
// AMENITIES (Áreas Comunales)
// ==========================================

export interface Amenity {
  id: string;
  condominium_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  max_capacity: number;

  // Reglas de aprobación
  requires_approval: boolean;
  cancelation_cutoff_hours: number;

  // Reglas financieras
  is_rentable: boolean;
  rental_cost: number;
  requires_guarantee: boolean;
  guarantee_amount: number;
  expense_item_id: string | null;

  // Reglas de cartera
  allow_debtors: boolean;
  debt_grace_day: number;

  // Meta
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Joins opcionales
  expense_item?: { id: string; name: string } | null;
}

// ==========================================
// BOOKINGS (Reservas)
// ==========================================

export type BookingStatus = "pending_approval" | "confirmed" | "canceled" | "completed";
export type GuaranteeStatus = "held" | "applied_to_balance" | "refunded_externally";

export interface Booking {
  id: string;
  condominium_id: string;
  amenity_id: string;
  unit_id: string;
  profile_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;

  // Vínculos financieros
  rental_charge_id: string | null;
  guarantee_charge_id: string | null;
  guarantee_status: GuaranteeStatus | null;

  // Trazabilidad
  notes: string | null;
  canceled_at: string | null;
  canceled_by: string | null;
  cancellation_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  created_by: string | null;

  // Joins opcionales
  amenity?: Amenity | null;
  unit?: { id: string; identifier: string; full_identifier: string | null } | null;
  profile?: { id: string; full_name: string | null } | null;
  rental_charge?: { id: string; total_amount: number; balance: number; status: string } | null;
  guarantee_charge?: { id: string; total_amount: number; balance: number; status: string } | null;
}

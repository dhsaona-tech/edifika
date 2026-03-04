"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getUser";
import { logAudit } from "@/lib/audit/logAudit";
import { revalidatePath } from "next/cache";
import {
  amenitySchema,
  createBookingSchema,
  bookingFiltersSchema,
  type AmenityInput,
  type CreateBookingInput,
  type BookingFilters,
} from "@/lib/bookings/schemas";
import type { Amenity, Booking } from "@/types/bookings";

// ==========================================
// AMENITIES - CRUD
// ==========================================

export async function listAmenities(condominiumId: string): Promise<Amenity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("amenities")
    .select("*, expense_item:expense_items(id, name)")
    .eq("condominium_id", condominiumId)
    .order("name");

  if (error) {
    console.error("Error listando amenities:", error);
    return [];
  }

  return (data || []).map((a: any) => ({
    ...a,
    expense_item: Array.isArray(a.expense_item)
      ? a.expense_item[0]
      : a.expense_item,
  }));
}

export async function getAmenity(
  condominiumId: string,
  amenityId: string
): Promise<Amenity | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("amenities")
    .select("*, expense_item:expense_items(id, name)")
    .eq("id", amenityId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    expense_item: Array.isArray(data.expense_item)
      ? data.expense_item[0]
      : data.expense_item,
  };
}

export async function createAmenity(
  condominiumId: string,
  input: AmenityInput
): Promise<{ success?: boolean; error?: string; amenityId?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const parsed = amenitySchema.parse(input);

  const { data, error } = await supabase
    .from("amenities")
    .insert({
      condominium_id: condominiumId,
      name: parsed.name,
      description: parsed.description || null,
      photo_url: parsed.photo_url || null,
      max_capacity: parsed.max_capacity,
      requires_approval: parsed.requires_approval,
      cancelation_cutoff_hours: parsed.cancelation_cutoff_hours,
      is_rentable: parsed.is_rentable,
      rental_cost: parsed.is_rentable ? parsed.rental_cost : 0,
      requires_guarantee: parsed.requires_guarantee,
      guarantee_amount: parsed.requires_guarantee ? parsed.guarantee_amount : 0,
      expense_item_id: parsed.expense_item_id || null,
      allow_debtors: parsed.allow_debtors,
      debt_grace_day: parsed.debt_grace_day,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Error creando amenity:", error);
    return { error: "No se pudo crear el área comunal." };
  }

  logAudit({
    condominiumId,
    tableName: "amenities",
    recordId: data.id,
    action: "CREATE",
    newValues: { name: parsed.name },
    performedBy: user.id,
  });

  revalidatePath(`/app/${condominiumId}/bookings`);
  return { success: true, amenityId: data.id };
}

export async function updateAmenity(
  condominiumId: string,
  amenityId: string,
  input: AmenityInput
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const parsed = amenitySchema.parse(input);

  const { error } = await supabase
    .from("amenities")
    .update({
      name: parsed.name,
      description: parsed.description || null,
      photo_url: parsed.photo_url || null,
      max_capacity: parsed.max_capacity,
      requires_approval: parsed.requires_approval,
      cancelation_cutoff_hours: parsed.cancelation_cutoff_hours,
      is_rentable: parsed.is_rentable,
      rental_cost: parsed.is_rentable ? parsed.rental_cost : 0,
      requires_guarantee: parsed.requires_guarantee,
      guarantee_amount: parsed.requires_guarantee ? parsed.guarantee_amount : 0,
      expense_item_id: parsed.expense_item_id || null,
      allow_debtors: parsed.allow_debtors,
      debt_grace_day: parsed.debt_grace_day,
    })
    .eq("id", amenityId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("Error actualizando amenity:", error);
    return { error: "No se pudo actualizar el área comunal." };
  }

  logAudit({
    condominiumId,
    tableName: "amenities",
    recordId: amenityId,
    action: "UPDATE",
    newValues: { name: parsed.name },
    performedBy: user.id,
  });

  revalidatePath(`/app/${condominiumId}/bookings`);
  return { success: true };
}

export async function toggleAmenityActive(
  condominiumId: string,
  amenityId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Obtener estado actual
  const { data: current } = await supabase
    .from("amenities")
    .select("is_active, name")
    .eq("id", amenityId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!current) return { error: "Área comunal no encontrada." };

  const newState = !current.is_active;

  const { error } = await supabase
    .from("amenities")
    .update({ is_active: newState })
    .eq("id", amenityId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("Error toggling amenity:", error);
    return { error: "No se pudo cambiar el estado." };
  }

  logAudit({
    condominiumId,
    tableName: "amenities",
    recordId: amenityId,
    action: "UPDATE",
    oldValues: { is_active: current.is_active },
    newValues: { is_active: newState },
    performedBy: user.id,
    notes: newState ? "Activado" : "Desactivado",
  });

  revalidatePath(`/app/${condominiumId}/bookings`);
  return { success: true };
}

// ==========================================
// BOOKINGS - QUERIES
// ==========================================

export async function listBookings(
  condominiumId: string,
  filters?: BookingFilters
): Promise<Booking[]> {
  const supabase = await createClient();

  const f = filters ? bookingFiltersSchema.safeParse(filters) : null;
  const parsed = f?.success ? f.data : {};

  let query = supabase
    .from("bookings")
    .select(
      `
      *,
      amenity:amenities(id, name, max_capacity, requires_approval, cancelation_cutoff_hours,
        is_rentable, rental_cost, requires_guarantee, guarantee_amount),
      unit:units(id, identifier, full_identifier),
      profile:profiles(id, full_name),
      rental_charge:charges!bookings_rental_charge_id_fkey(id, total_amount, balance, status),
      guarantee_charge:charges!bookings_guarantee_charge_id_fkey(id, total_amount, balance, status)
    `
    )
    .eq("condominium_id", condominiumId)
    .order("start_time", { ascending: false });

  if (parsed.amenity_id) {
    query = query.eq("amenity_id", parsed.amenity_id);
  }
  if (parsed.status) {
    query = query.eq("status", parsed.status);
  }
  if (parsed.date_from) {
    query = query.gte("start_time", parsed.date_from);
  }
  if (parsed.date_to) {
    query = query.lte("start_time", parsed.date_to + "T23:59:59");
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listando bookings:", error);
    return [];
  }

  return (data || []).map((b: any) => ({
    ...b,
    amenity: Array.isArray(b.amenity) ? b.amenity[0] : b.amenity,
    unit: Array.isArray(b.unit) ? b.unit[0] : b.unit,
    profile: Array.isArray(b.profile) ? b.profile[0] : b.profile,
    rental_charge: Array.isArray(b.rental_charge)
      ? b.rental_charge[0]
      : b.rental_charge,
    guarantee_charge: Array.isArray(b.guarantee_charge)
      ? b.guarantee_charge[0]
      : b.guarantee_charge,
  }));
}

export async function getBooking(
  condominiumId: string,
  bookingId: string
): Promise<Booking | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      amenity:amenities(*),
      unit:units(id, identifier, full_identifier),
      profile:profiles(id, full_name),
      rental_charge:charges!bookings_rental_charge_id_fkey(id, total_amount, balance, status),
      guarantee_charge:charges!bookings_guarantee_charge_id_fkey(id, total_amount, balance, status)
    `
    )
    .eq("id", bookingId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    amenity: Array.isArray(data.amenity) ? data.amenity[0] : data.amenity,
    unit: Array.isArray(data.unit) ? data.unit[0] : data.unit,
    profile: Array.isArray(data.profile) ? data.profile[0] : data.profile,
    rental_charge: Array.isArray(data.rental_charge)
      ? data.rental_charge[0]
      : data.rental_charge,
    guarantee_charge: Array.isArray(data.guarantee_charge)
      ? data.guarantee_charge[0]
      : data.guarantee_charge,
  };
}

// ==========================================
// BOOKINGS - CREAR RESERVA
// ==========================================

export async function createBooking(
  condominiumId: string,
  input: CreateBookingInput
): Promise<{ success?: boolean; error?: string; bookingId?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const parsed = createBookingSchema.parse(input);

  // 1. Obtener configuración del amenity
  const { data: amenity } = await supabase
    .from("amenities")
    .select("*")
    .eq("id", parsed.amenity_id)
    .eq("condominium_id", condominiumId)
    .eq("is_active", true)
    .maybeSingle();

  if (!amenity) {
    return { error: "Área comunal no encontrada o está inactiva." };
  }

  // 2. Validar morosidad
  if (!amenity.allow_debtors) {
    const today = new Date();
    const currentDay = today.getDate();

    if (currentDay > amenity.debt_grace_day) {
      const { count } = await supabase
        .from("charges")
        .select("id", { count: "exact", head: true })
        .eq("unit_id", parsed.unit_id)
        .eq("condominium_id", condominiumId)
        .in("status", ["pendiente", "parcialmente_pagado"])
        .gt("balance", 0);

      if (count && count > 0) {
        return {
          error: `La unidad tiene cargos pendientes. No se permite reservar después del día ${amenity.debt_grace_day} del mes.`,
        };
      }
    }
  }

  // 3. Validar disponibilidad (capacidad)
  const { count: overlapping } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("amenity_id", parsed.amenity_id)
    .eq("condominium_id", condominiumId)
    .in("status", ["pending_approval", "confirmed"])
    .lt("start_time", parsed.end_time)
    .gt("end_time", parsed.start_time);

  if (overlapping !== null && overlapping >= amenity.max_capacity) {
    return {
      error: `El área ya está reservada al máximo de su capacidad (${amenity.max_capacity}) en ese horario.`,
    };
  }

  // 4. Determinar status
  const status = amenity.requires_approval ? "pending_approval" : "confirmed";

  // 5. Crear cargos financieros si aplica
  let rentalChargeId: string | null = null;
  let guaranteeChargeId: string | null = null;
  const today = new Date().toISOString().slice(0, 10);

  if (amenity.is_rentable && amenity.rental_cost > 0) {
    const { data: rentalCharge, error: rcError } = await supabase
      .from("charges")
      .insert({
        condominium_id: condominiumId,
        unit_id: parsed.unit_id,
        expense_item_id: amenity.expense_item_id,
        period: parsed.start_time.slice(0, 7) + "-01",
        posted_date: today,
        due_date: parsed.start_time.slice(0, 10),
        total_amount: amenity.rental_cost,
        paid_amount: 0,
        status: "pendiente",
        charge_type: "reserva",
        description: `Alquiler - ${amenity.name}`,
      })
      .select("id")
      .single();

    if (rcError || !rentalCharge) {
      console.error("Error creando cargo de alquiler:", rcError);
      return { error: "No se pudo generar el cargo de alquiler." };
    }
    rentalChargeId = rentalCharge.id;
  }

  if (amenity.requires_guarantee && amenity.guarantee_amount > 0) {
    const { data: guaranteeCharge, error: gcError } = await supabase
      .from("charges")
      .insert({
        condominium_id: condominiumId,
        unit_id: parsed.unit_id,
        expense_item_id: amenity.expense_item_id,
        period: parsed.start_time.slice(0, 7) + "-01",
        posted_date: today,
        due_date: parsed.start_time.slice(0, 10),
        total_amount: amenity.guarantee_amount,
        paid_amount: 0,
        status: "pendiente",
        charge_type: "reserva",
        description: `Garantía - ${amenity.name}`,
      })
      .select("id")
      .single();

    if (gcError || !guaranteeCharge) {
      console.error("Error creando cargo de garantía:", gcError);
      return { error: "No se pudo generar el cargo de garantía." };
    }
    guaranteeChargeId = guaranteeCharge.id;
  }

  // 6. Crear la reserva
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      condominium_id: condominiumId,
      amenity_id: parsed.amenity_id,
      unit_id: parsed.unit_id,
      profile_id: user.id,
      start_time: parsed.start_time,
      end_time: parsed.end_time,
      status,
      rental_charge_id: rentalChargeId,
      guarantee_charge_id: guaranteeChargeId,
      guarantee_status: guaranteeChargeId ? "held" : null,
      notes: parsed.notes || null,
      approved_at: status === "confirmed" ? new Date().toISOString() : null,
      approved_by: status === "confirmed" ? user.id : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    console.error("Error creando booking:", bookingError);
    return { error: "No se pudo crear la reserva." };
  }

  logAudit({
    condominiumId,
    tableName: "bookings",
    recordId: booking.id,
    action: "CREATE",
    newValues: {
      amenity_id: parsed.amenity_id,
      unit_id: parsed.unit_id,
      status,
      rental_charge_id: rentalChargeId,
      guarantee_charge_id: guaranteeChargeId,
    },
    performedBy: user.id,
  });

  revalidatePath(`/app/${condominiumId}/bookings`);
  revalidatePath(`/app/${condominiumId}/charges`);
  return { success: true, bookingId: booking.id };
}

// ==========================================
// BOOKINGS - APROBAR
// ==========================================

export async function approveBooking(
  condominiumId: string,
  bookingId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!booking) return { error: "Reserva no encontrada." };
  if (booking.status !== "pending_approval") {
    return { error: "La reserva no está pendiente de aprobación." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("id", bookingId);

  if (error) {
    console.error("Error aprobando booking:", error);
    return { error: "No se pudo aprobar la reserva." };
  }

  logAudit({
    condominiumId,
    tableName: "bookings",
    recordId: bookingId,
    action: "APROBACION",
    newValues: { status: "confirmed" },
    performedBy: user.id,
  });

  revalidatePath(`/app/${condominiumId}/bookings`);
  return { success: true };
}

// ==========================================
// BOOKINGS - CANCELAR
// ==========================================

export async function cancelBooking(
  condominiumId: string,
  bookingId: string,
  reason: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Obtener booking con amenity para validar cutoff
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      id, status, start_time, rental_charge_id, guarantee_charge_id,
      amenity:amenities(cancelation_cutoff_hours)
    `
    )
    .eq("id", bookingId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!booking) return { error: "Reserva no encontrada." };
  if (booking.status === "canceled") return { error: "La reserva ya está cancelada." };
  if (booking.status === "completed") return { error: "No se puede cancelar una reserva completada." };

  // Validar cutoff
  const amenity = Array.isArray(booking.amenity)
    ? booking.amenity[0]
    : booking.amenity;
  const cutoffHours = amenity?.cancelation_cutoff_hours ?? 24;
  const startTime = new Date(booking.start_time).getTime();
  const now = Date.now();
  const hoursUntilEvent = (startTime - now) / (1000 * 60 * 60);

  if (hoursUntilEvent < cutoffHours) {
    return {
      error: `No se puede cancelar. El límite de cancelación es ${cutoffHours} horas antes del evento y solo faltan ${Math.max(0, Math.floor(hoursUntilEvent))} horas.`,
    };
  }

  // Cancelar la reserva
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      canceled_by: user.id,
      cancellation_reason: reason || null,
      guarantee_status: null,
    })
    .eq("id", bookingId);

  if (error) {
    console.error("Error cancelando booking:", error);
    return { error: "No se pudo cancelar la reserva." };
  }

  // Cancelar cargos vinculados si no están pagados
  const chargeIds = [booking.rental_charge_id, booking.guarantee_charge_id].filter(
    Boolean
  ) as string[];

  if (chargeIds.length > 0) {
    await supabase
      .from("charges")
      .update({
        status: "cancelado",
        cancellation_reason: "Reserva cancelada",
        cancelled_at: new Date().toISOString(),
        cancelled_by_profile_id: user.id,
      })
      .in("id", chargeIds)
      .in("status", ["pendiente"]);
  }

  logAudit({
    condominiumId,
    tableName: "bookings",
    recordId: bookingId,
    action: "ANULACION",
    newValues: { status: "canceled", reason },
    performedBy: user.id,
  });

  revalidatePath(`/app/${condominiumId}/bookings`);
  revalidatePath(`/app/${condominiumId}/charges`);
  return { success: true };
}

// ==========================================
// BOOKINGS - COMPLETAR
// ==========================================

export async function completeBooking(
  condominiumId: string,
  bookingId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, guarantee_charge_id")
    .eq("id", bookingId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!booking) return { error: "Reserva no encontrada." };
  if (booking.status !== "confirmed") {
    return { error: "Solo se pueden completar reservas confirmadas." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: user.id,
      guarantee_status: booking.guarantee_charge_id ? "held" : null,
    })
    .eq("id", bookingId);

  if (error) {
    console.error("Error completando booking:", error);
    return { error: "No se pudo completar la reserva." };
  }

  logAudit({
    condominiumId,
    tableName: "bookings",
    recordId: bookingId,
    action: "UPDATE",
    newValues: { status: "completed" },
    performedBy: user.id,
  });

  revalidatePath(`/app/${condominiumId}/bookings`);
  return { success: true };
}

// ==========================================
// BOOKINGS - RESOLVER GARANTÍA
// ==========================================

export async function resolveGuarantee(
  condominiumId: string,
  bookingId: string,
  resolution: "applied_to_balance" | "refunded_externally",
  financialAccountId?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Validar estado
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      id, status, guarantee_status, guarantee_charge_id, unit_id,
      amenity:amenities(name)
    `
    )
    .eq("id", bookingId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!booking) return { error: "Reserva no encontrada." };
  if (booking.status !== "completed") {
    return { error: "La reserva debe estar completada para resolver la garantía." };
  }
  if (booking.guarantee_status !== "held") {
    return { error: "La garantía ya fue resuelta o no existe." };
  }
  if (!booking.guarantee_charge_id) {
    return { error: "Esta reserva no tiene cargo de garantía." };
  }

  // Obtener monto de la garantía
  const { data: guaranteeCharge } = await supabase
    .from("charges")
    .select("id, total_amount")
    .eq("id", booking.guarantee_charge_id)
    .maybeSingle();

  if (!guaranteeCharge) {
    return { error: "Cargo de garantía no encontrado." };
  }

  const guaranteeAmount = Number(guaranteeCharge.total_amount);
  const amenityName =
    (Array.isArray(booking.amenity) ? booking.amenity[0] : booking.amenity)
      ?.name || "Área comunal";

  // Obtener identificador de la unidad
  const { data: unit } = await supabase
    .from("units")
    .select("identifier, full_identifier")
    .eq("id", booking.unit_id)
    .maybeSingle();

  const unitLabel = unit?.full_identifier || unit?.identifier || booking.unit_id;

  if (resolution === "applied_to_balance") {
    // Insertar crédito a favor de la unidad (mismo patrón que createManualCredit)
    const { error: creditError } = await supabase
      .from("unit_credits")
      .insert({
        condominium_id: condominiumId,
        unit_id: booking.unit_id,
        amount: guaranteeAmount,
        remaining_amount: guaranteeAmount,
        status: "activo",
      });

    if (creditError) {
      console.error("Error creando crédito por garantía:", creditError);
      return { error: "No se pudo crear el saldo a favor." };
    }
  } else if (resolution === "refunded_externally") {
    if (!financialAccountId) {
      return { error: "Debe seleccionar una cuenta para la devolución." };
    }

    // Crear egreso para la devolución
    const { error: egressError } = await supabase.from("egresses").insert({
      condominium_id: condominiumId,
      financial_account_id: financialAccountId,
      payment_date: new Date().toISOString().slice(0, 10),
      total_amount: guaranteeAmount,
      total_allocated_amount: 0,
      payment_method: "transferencia",
      notes: `Devolución de garantía - ${amenityName} - Unidad ${unitLabel}`,
      status: "disponible",
    });

    if (egressError) {
      console.error("Error creando egreso por garantía:", egressError);
      return { error: "No se pudo registrar la devolución." };
    }
  }

  // Actualizar booking
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ guarantee_status: resolution })
    .eq("id", bookingId);

  if (updateError) {
    console.error("Error actualizando guarantee_status:", updateError);
    return { error: "No se pudo actualizar el estado de la garantía." };
  }

  logAudit({
    condominiumId,
    tableName: "bookings",
    recordId: bookingId,
    action: "UPDATE",
    newValues: {
      guarantee_status: resolution,
      guarantee_amount: guaranteeAmount,
      ...(resolution === "refunded_externally"
        ? { financial_account_id: financialAccountId }
        : {}),
    },
    performedBy: user.id,
    notes: `Garantía resuelta: ${resolution === "applied_to_balance" ? "Saldo a favor" : "Devolución externa"}`,
  });

  revalidatePath(`/app/${condominiumId}/bookings`);
  revalidatePath(`/app/${condominiumId}/credits`);
  revalidatePath(`/app/${condominiumId}/egresses`);
  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  return { success: true };
}

// ==========================================
// HELPERS
// ==========================================

export async function getUnitsForBooking(
  condominiumId: string
): Promise<{ id: string; identifier: string; full_identifier: string | null; contact_name: string | null }[]> {
  const supabase = await createClient();

  const { data: units } = await supabase
    .from("units")
    .select("id, identifier, full_identifier")
    .eq("condominium_id", condominiumId)
    .eq("status", "activa")
    .order("identifier");

  if (!units || units.length === 0) return [];

  // Obtener contactos primarios
  const unitIds = units.map((u) => u.id);
  const { data: contacts } = await supabase
    .from("unit_contacts")
    .select("unit_id, profiles(full_name)")
    .in("unit_id", unitIds)
    .eq("is_primary_contact", true)
    .is("end_date", null);

  const contactMap = new Map<string, string>();
  (contacts || []).forEach((c: any) => {
    const name = Array.isArray(c.profiles)
      ? c.profiles[0]?.full_name
      : c.profiles?.full_name;
    if (name) contactMap.set(c.unit_id, name);
  });

  return units.map((u) => ({
    ...u,
    contact_name: contactMap.get(u.id) || null,
  }));
}

export async function getExpenseItemsForAmenity(
  condominiumId: string
): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expense_items")
    .select("id, name")
    .eq("condominium_id", condominiumId)
    .eq("is_active", true)
    .order("name");

  if (error) return [];
  return data || [];
}

export async function getFinancialAccountsForRefund(
  condominiumId: string
): Promise<{ id: string; bank_name: string; account_number: string }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("financial_accounts")
    .select("id, bank_name, account_number")
    .eq("condominium_id", condominiumId)
    .eq("is_active", true)
    .order("bank_name");

  if (error) return [];
  return data || [];
}

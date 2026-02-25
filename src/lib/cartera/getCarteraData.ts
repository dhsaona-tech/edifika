import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TIPOS PARA CARTERA / ESTADO DE CUENTA
// ============================================================================

export type CarteraCharge = {
  id: string;
  period: string | null;
  posted_date: string;
  due_date: string;
  description: string | null;
  charge_type: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  expense_item_name: string | null;
  is_overdue: boolean;
  days_overdue: number;
};

export type CarteraPayment = {
  id: string;
  payment_date: string;
  folio_rec: number | null;
  total_amount: number;
  payment_method: string;
  reference_number: string | null;
  status: string;
  allocations: Array<{
    charge_id: string;
    amount_allocated: number;
    charge_description: string | null;
    charge_period: string | null;
  }>;
};

export type PeriodSummary = {
  period: string;
  period_label: string;
  charges: Array<{
    id: string;
    expense_item_name: string | null;
    charge_type: string;
    description: string | null;
    total_amount: number;
    paid_amount: number;
    balance: number;
    status: string;
    due_date: string;
    is_overdue: boolean;
    days_overdue: number;
  }>;
  payments: Array<{
    id: string;
    payment_date: string;
    folio_rec: number | null;
    amount_applied: number;
    payment_method: string;
    reference_number: string | null;
  }>;
  total_charged: number;
  total_paid: number;
  balance: number;
  status: "pagado" | "parcial" | "pendiente" | "vencido";
};

export type CarteraData = {
  unit: {
    id: string;
    identifier: string;
    full_identifier: string | null;
    type: string;
    aliquot: number;
    status: string;
  };
  owner: {
    id: string | null;
    full_name: string;
    email: string | null;
    phone: string | null;
  };
  condominium: {
    id: string;
    name: string;
    address: string | null;
  };
  summary: {
    total_charges: number;
    total_paid: number;
    total_pending: number;
    total_overdue: number;
    credit_balance: number;
    charges_count: number;
    payments_count: number;
  };
  charges: CarteraCharge[];
  payments: CarteraPayment[];
  periods: PeriodSummary[];
  generated_at: string;
};

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

export async function getCarteraData(
  condominiumId: string,
  unitId: string,
  filters?: { from?: string; to?: string; status?: string },
  supabaseClient?: SupabaseClient
): Promise<CarteraData | null> {
  const supabase = supabaseClient || (await createClient());
  const today = new Date().toISOString().split("T")[0];

  // 1. Obtener datos de la unidad
  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, identifier, full_identifier, type, aliquot, status, credit_balance")
    .eq("id", unitId)
    .eq("condominium_id", condominiumId)
    .single();

  if (unitError || !unit) return null;

  // 2. Obtener condominio
  const { data: condo } = await supabase
    .from("condominiums")
    .select("id, name, address")
    .eq("id", condominiumId)
    .single();

  // 3. Obtener propietario/contacto principal
  const { data: primaryContact } = await supabase
    .from("unit_contacts")
    .select("profile:profiles(id, full_name, email, phone)")
    .eq("unit_id", unitId)
    .eq("is_primary_contact", true)
    .is("end_date", null)
    .maybeSingle();

  const profile = primaryContact?.profile
    ? (Array.isArray(primaryContact.profile) ? primaryContact.profile[0] : primaryContact.profile)
    : null;

  // 4. Obtener cargos
  let chargesQuery = supabase
    .from("charges")
    .select(`
      id, period, posted_date, due_date, description, charge_type,
      total_amount, paid_amount, balance, status,
      expense_item:expense_items(name)
    `)
    .eq("condominium_id", condominiumId)
    .eq("unit_id", unitId)
    .not("status", "in", '("cancelado","eliminado")')
    .order("period", { ascending: false, nullsFirst: false })
    .order("due_date", { ascending: false });

  if (filters?.from) chargesQuery = chargesQuery.gte("posted_date", filters.from);
  if (filters?.to) chargesQuery = chargesQuery.lte("posted_date", filters.to);
  if (filters?.status === "pendiente") chargesQuery = chargesQuery.eq("status", "pendiente");
  if (filters?.status === "pagado") chargesQuery = chargesQuery.eq("status", "pagado");

  const { data: chargesRaw } = await chargesQuery;

  const charges: CarteraCharge[] = (chargesRaw || []).map((c: any) => {
    const dueDate = new Date(c.due_date);
    const todayDate = new Date(today);
    const isOverdue = c.status === "pendiente" && dueDate < todayDate;
    const daysOverdue = isOverdue
      ? Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      id: c.id,
      period: c.period,
      posted_date: c.posted_date,
      due_date: c.due_date,
      description: c.description,
      charge_type: c.charge_type,
      total_amount: Number(c.total_amount || 0),
      paid_amount: Number(c.paid_amount || 0),
      balance: Number(c.balance || 0),
      status: c.status,
      expense_item_name: c.expense_item?.name || null,
      is_overdue: isOverdue,
      days_overdue: daysOverdue,
    };
  });

  // 5. Obtener pagos con allocations detalladas
  let paymentsQuery = supabase
    .from("payments")
    .select(`
      id, payment_date, folio_rec, total_amount, payment_method, reference_number, status,
      allocations:payment_allocations(
        charge_id,
        amount_allocated,
        charge:charges(description, period)
      )
    `)
    .eq("condominium_id", condominiumId)
    .eq("unit_id", unitId)
    .neq("status", "cancelado")
    .order("payment_date", { ascending: false });

  if (filters?.from) paymentsQuery = paymentsQuery.gte("payment_date", filters.from);
  if (filters?.to) paymentsQuery = paymentsQuery.lte("payment_date", filters.to);

  const { data: paymentsRaw } = await paymentsQuery;

  const payments: CarteraPayment[] = (paymentsRaw || []).map((p: any) => ({
    id: p.id,
    payment_date: p.payment_date,
    folio_rec: p.folio_rec,
    total_amount: Number(p.total_amount || 0),
    payment_method: p.payment_method,
    reference_number: p.reference_number,
    status: p.status,
    allocations: (p.allocations || []).map((a: any) => ({
      charge_id: a.charge_id,
      amount_allocated: Number(a.amount_allocated || 0),
      charge_description: a.charge?.description || null,
      charge_period: a.charge?.period || null,
    })),
  }));

  // 6. Crear mapa de pagos por cargo
  const paymentsByChargeId = new Map<string, Array<{
    payment_id: string;
    payment_date: string;
    folio_rec: number | null;
    amount_applied: number;
    payment_method: string;
    reference_number: string | null;
  }>>();

  payments.forEach(p => {
    p.allocations.forEach(a => {
      if (!paymentsByChargeId.has(a.charge_id)) {
        paymentsByChargeId.set(a.charge_id, []);
      }
      paymentsByChargeId.get(a.charge_id)!.push({
        payment_id: p.id,
        payment_date: p.payment_date,
        folio_rec: p.folio_rec,
        amount_applied: a.amount_allocated,
        payment_method: p.payment_method,
        reference_number: p.reference_number,
      });
    });
  });

  // 7. Agrupar por periodo
  const periodMap = new Map<string, PeriodSummary>();

  // Helper para formatear periodo de forma segura
  const formatPeriodLabel = (period: string | null): string => {
    if (!period) return "Sin periodo asignado";
    try {
      // Si el periodo es YYYY-MM, agregar -01
      // Si ya es YYYY-MM-DD, usarlo directamente
      const dateStr = period.length === 7 ? `${period}-01` : period;
      const date = new Date(dateStr + "T00:00:00");
      if (isNaN(date.getTime())) return period; // Si no es válido, devolver el string original
      const label = date.toLocaleDateString("es-EC", { month: "long", year: "numeric" });
      return label.charAt(0).toUpperCase() + label.slice(1);
    } catch {
      return period;
    }
  };

  // Helper para normalizar periodo a YYYY-MM para agrupación
  const normalizePeriod = (period: string | null): string => {
    if (!period) return "sin_periodo";
    // Si es YYYY-MM-DD, extraer solo YYYY-MM
    if (period.length === 10) return period.substring(0, 7);
    return period;
  };

  charges.forEach(c => {
    const periodKey = normalizePeriod(c.period);

    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, {
        period: periodKey,
        period_label: formatPeriodLabel(c.period),
        charges: [],
        payments: [],
        total_charged: 0,
        total_paid: 0,
        balance: 0,
        status: "pendiente",
      });
    }

    const periodData = periodMap.get(periodKey)!;

    periodData.charges.push({
      id: c.id,
      expense_item_name: c.expense_item_name,
      charge_type: c.charge_type,
      description: c.description,
      total_amount: c.total_amount,
      paid_amount: c.paid_amount,
      balance: c.balance,
      status: c.status,
      due_date: c.due_date,
      is_overdue: c.is_overdue,
      days_overdue: c.days_overdue,
    });

    // Agregar pagos asociados a este cargo
    const chargePayments = paymentsByChargeId.get(c.id) || [];
    chargePayments.forEach(cp => {
      // Evitar duplicados
      if (!periodData.payments.find(p => p.id === cp.payment_id && p.amount_applied === cp.amount_applied)) {
        periodData.payments.push({
          id: cp.payment_id,
          payment_date: cp.payment_date,
          folio_rec: cp.folio_rec,
          amount_applied: cp.amount_applied,
          payment_method: cp.payment_method,
          reference_number: cp.reference_number,
        });
      }
    });

    periodData.total_charged += c.total_amount;
    periodData.total_paid += c.paid_amount;
    periodData.balance += c.balance;
  });

  // 8. Determinar estado de cada periodo
  periodMap.forEach((p, key) => {
    if (p.balance <= 0.01) {
      p.status = "pagado";
    } else if (p.total_paid > 0.01) {
      p.status = "parcial";
    } else if (p.charges.some(c => c.is_overdue)) {
      p.status = "vencido";
    } else {
      p.status = "pendiente";
    }
  });

  // 9. Convertir a array y ordenar por periodo (más reciente primero)
  const periods = Array.from(periodMap.values()).sort((a, b) => {
    if (a.period === "sin_periodo") return 1;
    if (b.period === "sin_periodo") return -1;
    return b.period.localeCompare(a.period);
  });

  // 10. Calcular resumen
  const totalCharges = charges.reduce((sum, c) => sum + c.total_amount, 0);
  const totalPaid = charges.reduce((sum, c) => sum + c.paid_amount, 0);
  const totalPending = charges.filter(c => c.status === "pendiente").reduce((sum, c) => sum + c.balance, 0);
  const totalOverdue = charges.filter(c => c.is_overdue).reduce((sum, c) => sum + c.balance, 0);

  return {
    unit: {
      id: unit.id,
      identifier: unit.identifier,
      full_identifier: unit.full_identifier,
      type: unit.type,
      aliquot: Number(unit.aliquot || 0),
      status: unit.status,
    },
    owner: {
      id: profile?.id || null,
      full_name: profile?.full_name || "Sin asignar",
      email: profile?.email || null,
      phone: profile?.phone || null,
    },
    condominium: {
      id: condo?.id || condominiumId,
      name: condo?.name || "Condominio",
      address: condo?.address || null,
    },
    summary: {
      total_charges: totalCharges,
      total_paid: totalPaid,
      total_pending: totalPending,
      total_overdue: totalOverdue,
      credit_balance: Number(unit.credit_balance || 0),
      charges_count: charges.length,
      payments_count: payments.length,
    },
    charges,
    payments,
    periods,
    generated_at: new Date().toISOString(),
  };
}

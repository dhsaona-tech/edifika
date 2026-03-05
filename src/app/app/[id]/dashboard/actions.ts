"use server";

import { createClient } from "@/lib/supabase/server";

export interface DashboardMetrics {
  units: {
    total: number;
    active: number;
    withDebt: number;
  };
  residents: {
    total: number;
    owners: number;
    tenants: number;
  };
  financial: {
    pendingCharges: number;
    totalDebt: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    accountBalance: number;
  };
  recentActivity: {
    recentPayments: number;
    recentCharges: number;
    pendingPayables: number;
  };
}

export interface MorosidadCategory {
  name: string;
  value: number;
  color: string;
}

export async function getMorosidadChartData(
  condominiumId: string,
): Promise<MorosidadCategory[]> {
  const supabase = await createClient();

  const { data: charges } = await supabase
    .from("charges")
    .select("balance, due_date")
    .eq("condominium_id", condominiumId)
    .eq("status", "pendiente")
    .gt("balance", 0);

  const now = new Date();
  const categories: Record<string, number> = {
    Vigente: 0,
    "1 a 30 días": 0,
    "31 a 60 días": 0,
    "Más de 60 días": 0,
  };

  if (charges) {
    for (const charge of charges) {
      const dueDate = new Date(charge.due_date);
      const diffMs = now.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const balance = Number(charge.balance || 0);

      if (diffDays <= 0) {
        categories["Vigente"] += balance;
      } else if (diffDays <= 30) {
        categories["1 a 30 días"] += balance;
      } else if (diffDays <= 60) {
        categories["31 a 60 días"] += balance;
      } else {
        categories["Más de 60 días"] += balance;
      }
    }
  }

  const colorMap: Record<string, string> = {
    Vigente: "#10b981",
    "1 a 30 días": "#f59e0b",
    "31 a 60 días": "#f97316",
    "Más de 60 días": "#ef4444",
  };

  return Object.entries(categories)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      color: colorMap[name],
    }));
}

export async function getDashboardMetrics(condominiumId: string): Promise<DashboardMetrics> {
  const supabase = await createClient();

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  // ── Fase 1: Todas las queries independientes en paralelo ──
  const [
    totalUnitsRes,
    activeUnitsRes,
    chargesWithDebtRes,
    membersRes,
    unitsRes,
    pendingChargesRes,
    monthlyPaymentsRes,
    monthlyEgressesRes,
    accountsRes,
    recentPaymentsRes,
    recentChargesRes,
    pendingPayablesRes,
  ] = await Promise.all([
    // 1. Total unidades
    supabase
      .from("units")
      .select("*", { count: "exact", head: true })
      .eq("condominium_id", condominiumId),

    // 2. Unidades activas
    supabase
      .from("units")
      .select("*", { count: "exact", head: true })
      .eq("condominium_id", condominiumId)
      .eq("status", "activa"),

    // 3. Unidades con deuda (incluye parcialmente_pagado)
    supabase
      .from("charges")
      .select("unit_id, balance, status")
      .eq("condominium_id", condominiumId)
      .in("status", ["pendiente", "parcialmente_pagado"])
      .gt("balance", 0),

    // 4. Membresías activas
    supabase
      .from("memberships")
      .select("profile_id, role")
      .eq("condominium_id", condominiumId)
      .eq("status", "activo"),

    // 5. IDs de unidades (para contactos)
    supabase
      .from("units")
      .select("id")
      .eq("condominium_id", condominiumId),

    // 6. Cargos pendientes y deuda total (incluye parcialmente_pagado)
    supabase
      .from("charges")
      .select("balance, total_amount")
      .eq("condominium_id", condominiumId)
      .in("status", ["pendiente", "parcialmente_pagado"]),

    // 7. Ingresos del mes
    supabase
      .from("payments")
      .select("total_amount")
      .eq("condominium_id", condominiumId)
      .gte("payment_date", `${currentMonth}-01`)
      .lt("payment_date", `${currentMonth}-32`)
      .neq("status", "cancelado"),

    // 8. Egresos del mes
    supabase
      .from("egresses")
      .select("total_amount")
      .eq("condominium_id", condominiumId)
      .gte("egress_date", `${currentMonth}-01`)
      .lt("egress_date", `${currentMonth}-32`)
      .neq("status", "cancelado"),

    // 9. Balance de cuentas
    supabase
      .from("financial_accounts")
      .select("current_balance")
      .eq("condominium_id", condominiumId)
      .eq("is_active", true),

    // 10. Pagos recientes (7 días)
    supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("condominium_id", condominiumId)
      .gte("payment_date", sevenDaysAgoStr)
      .neq("status", "cancelado"),

    // 11. Cargos recientes (7 días)
    supabase
      .from("charges")
      .select("*", { count: "exact", head: true })
      .eq("condominium_id", condominiumId)
      .gte("posted_date", sevenDaysAgoStr)
      .neq("status", "cancelado"),

    // 12. Cuentas por pagar pendientes (tabla correcta: payable_orders)
    supabase
      .from("payable_orders")
      .select("*", { count: "exact", head: true })
      .eq("condominium_id", condominiumId)
      .in("status", ["pendiente", "parcialmente_pagado"]),
  ]);

  // ── Fase 2: Contactos (depende de unitsData) ──
  const unitIds = unitsRes.data?.map((u) => u.id) || [];

  const { data: contactsData } = await supabase
    .from("unit_contacts")
    .select("profile_id, relationship_type")
    .in("unit_id", unitIds.length > 0 ? unitIds : ["00000000-0000-0000-0000-000000000000"])
    .is("end_date", null);

  // ── Procesar resultados ──
  const chargesData = chargesWithDebtRes.data;
  const unitsWithDebt = new Set(chargesData?.map((c) => c.unit_id) || []).size;

  const membersData = membersRes.data;
  const uniqueResidents = new Set([
    ...(membersData?.map((m) => m.profile_id) || []),
    ...(contactsData?.map((c) => c.profile_id) || []),
  ]).size;

  const owners = contactsData?.filter((c) => c.relationship_type === "OWNER").length || 0;
  const tenants = contactsData?.filter((c) => c.relationship_type === "TENANT").length || 0;

  const pendingChargesData = pendingChargesRes.data;
  const pendingCharges = pendingChargesData?.length || 0;
  const totalDebt =
    pendingChargesData?.reduce((sum, c) => sum + Number(c.balance || 0), 0) || 0;

  const monthlyIncome =
    monthlyPaymentsRes.data?.reduce((sum, p) => sum + Number(p.total_amount || 0), 0) || 0;
  const monthlyExpenses =
    monthlyEgressesRes.data?.reduce((sum, e) => sum + Number(e.total_amount || 0), 0) || 0;
  const accountBalance =
    accountsRes.data?.reduce((sum, a) => sum + Number(a.current_balance || 0), 0) || 0;

  return {
    units: {
      total: totalUnitsRes.count || 0,
      active: activeUnitsRes.count || 0,
      withDebt: unitsWithDebt,
    },
    residents: {
      total: uniqueResidents,
      owners,
      tenants,
    },
    financial: {
      pendingCharges,
      totalDebt,
      monthlyIncome,
      monthlyExpenses,
      accountBalance,
    },
    recentActivity: {
      recentPayments: recentPaymentsRes.count || 0,
      recentCharges: recentChargesRes.count || 0,
      pendingPayables: pendingPayablesRes.count || 0,
    },
  };
}

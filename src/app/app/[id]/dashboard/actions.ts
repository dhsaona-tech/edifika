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

export async function getDashboardMetrics(condominiumId: string): Promise<DashboardMetrics> {
  const supabase = await createClient();

  // 1. Unidades
  const { count: totalUnits } = await supabase
    .from("units")
    .select("*", { count: "exact", head: true })
    .eq("condominium_id", condominiumId);

  const { count: activeUnits } = await supabase
    .from("units")
    .select("*", { count: "exact", head: true })
    .eq("condominium_id", condominiumId)
    .eq("status", "activa");

  // Unidades con deuda
  const { data: chargesData } = await supabase
    .from("charges")
    .select("unit_id, balance, status")
    .eq("condominium_id", condominiumId)
    .eq("status", "pendiente")
    .gt("balance", 0);

  const unitsWithDebt = new Set(chargesData?.map((c) => c.unit_id) || []).size;

  // 2. Residentes
  const { data: membersData } = await supabase
    .from("memberships")
    .select("profile_id, role")
    .eq("condominium_id", condominiumId)
    .eq("status", "activo");

  // Obtener unidades del condominio primero
  const { data: unitsData } = await supabase
    .from("units")
    .select("id")
    .eq("condominium_id", condominiumId);

  const unitIds = unitsData?.map((u) => u.id) || [];

  const { data: contactsData } = await supabase
    .from("unit_contacts")
    .select("profile_id, relationship_type")
    .in("unit_id", unitIds.length > 0 ? unitIds : ["00000000-0000-0000-0000-000000000000"])
    .is("end_date", null);

  const uniqueResidents = new Set([
    ...(membersData?.map((m) => m.profile_id) || []),
    ...(contactsData?.map((c) => c.profile_id) || []),
  ]).size;

  const owners = contactsData?.filter((c) => c.relationship_type === "OWNER").length || 0;
  const tenants = contactsData?.filter((c) => c.relationship_type === "TENANT").length || 0;

  // 3. Financiero
  // Cargos pendientes y deuda total
  const { data: pendingChargesData } = await supabase
    .from("charges")
    .select("balance, total_amount")
    .eq("condominium_id", condominiumId)
    .eq("status", "pendiente");

  const pendingCharges = pendingChargesData?.length || 0;
  const totalDebt =
    pendingChargesData?.reduce((sum, c) => sum + Number(c.balance || 0), 0) || 0;

  // Ingresos del mes actual
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const { data: monthlyPayments } = await supabase
    .from("payments")
    .select("total_amount")
    .eq("condominium_id", condominiumId)
    .gte("payment_date", `${currentMonth}-01`)
    .lt("payment_date", `${currentMonth}-32`)
    .neq("status", "cancelado");

  const monthlyIncome = monthlyPayments?.reduce((sum, p) => sum + Number(p.total_amount || 0), 0) || 0;

  // Egresos del mes actual
  const { data: monthlyEgresses } = await supabase
    .from("egresses")
    .select("total_amount")
    .eq("condominium_id", condominiumId)
    .gte("egress_date", `${currentMonth}-01`)
    .lt("egress_date", `${currentMonth}-32`)
    .neq("status", "cancelado");

  const monthlyExpenses = monthlyEgresses?.reduce((sum, e) => sum + Number(e.total_amount || 0), 0) || 0;

  // Balance de cuentas financieras
  const { data: accounts } = await supabase
    .from("financial_accounts")
    .select("current_balance")
    .eq("condominium_id", condominiumId)
    .eq("is_active", true);

  const accountBalance = accounts?.reduce((sum, a) => sum + Number(a.current_balance || 0), 0) || 0;

  // 4. Actividad reciente (últimos 7 días)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const { count: recentPayments } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("condominium_id", condominiumId)
    .gte("payment_date", sevenDaysAgoStr)
    .neq("status", "cancelado");

  const { count: recentCharges } = await supabase
    .from("charges")
    .select("*", { count: "exact", head: true })
    .eq("condominium_id", condominiumId)
    .gte("posted_date", sevenDaysAgoStr)
    .neq("status", "cancelado");

  const { count: pendingPayables } = await supabase
    .from("payables")
    .select("*", { count: "exact", head: true })
    .eq("condominium_id", condominiumId)
    .eq("status", "pendiente");

  return {
    units: {
      total: totalUnits || 0,
      active: activeUnits || 0,
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
      recentPayments: recentPayments || 0,
      recentCharges: recentCharges || 0,
      pendingPayables: pendingPayables || 0,
    },
  };
}

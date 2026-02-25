"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// TIPOS
// ============================================================================

export type PettyCashVoucher = {
  id: string;
  condominium_id: string;
  financial_account_id: string;
  expense_item_id: string | null;
  voucher_number: number;
  voucher_date: string;
  amount: number;
  description: string;
  beneficiary: string | null;
  receipt_url: string | null;
  status: "pendiente" | "repuesto" | "anulado";
  replenishment_id: string | null;
  replenished_at: string | null;
  created_at: string;
  created_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  // Joins
  expense_item?: { name: string } | null;
  creator?: { full_name: string } | null;
};

export type PettyCashReplenishment = {
  id: string;
  condominium_id: string;
  financial_account_id: string;
  source_account_id: string;
  total_amount: number;
  vouchers_count: number;
  status: "pendiente" | "pagada" | "anulada";
  payable_order_id: string | null;
  egress_id: string | null;
  replenishment_date: string;
  paid_at: string | null;
  created_at: string;
  created_by: string | null;
  notes: string | null;
  // Joins
  source_account?: { bank_name: string; account_number: string } | null;
};

export type PettyCashStatus = {
  account_id: string;
  bank_name: string;
  max_amount: number;
  pending_vouchers_amount: number;
  pending_vouchers_count: number;
  cash_available: number;
  custodian_id: string | null;
  needs_replenishment: boolean;
};

// ============================================================================
// CONSULTAS
// ============================================================================

export async function getPettyCashStatus(condominiumId: string, accountId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_petty_cash_status", {
    p_account_id: accountId,
  });

  if (error) {
    console.error("Error getting petty cash status", error);
    return null;
  }

  return data as PettyCashStatus;
}

export async function getPettyCashAccounts(condominiumId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("v_petty_cash_summary")
    .select("*")
    .eq("condominium_id", condominiumId)
    .order("bank_name");

  if (error) {
    console.error("Error loading petty cash accounts", error);
    return [];
  }

  return data || [];
}

export async function getPettyCashVouchers(
  condominiumId: string,
  accountId: string,
  filters?: { status?: string; from?: string; to?: string }
) {
  const supabase = await createClient();

  let query = supabase
    .from("petty_cash_vouchers")
    .select(`
      *,
      expense_item:expense_items(name),
      creator:profiles!petty_cash_vouchers_created_by_fkey(full_name)
    `)
    .eq("condominium_id", condominiumId)
    .eq("financial_account_id", accountId)
    .order("voucher_date", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.from) {
    query = query.gte("voucher_date", filters.from);
  }
  if (filters?.to) {
    query = query.lte("voucher_date", filters.to);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error loading vouchers", error);
    return [];
  }

  return (data || []).map((v: any) => ({
    ...v,
    expense_item: Array.isArray(v.expense_item) ? v.expense_item[0] : v.expense_item,
    creator: Array.isArray(v.creator) ? v.creator[0] : v.creator,
  })) as PettyCashVoucher[];
}

export async function getPettyCashReplenishments(
  condominiumId: string,
  accountId: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("petty_cash_replenishments")
    .select(`
      *,
      source_account:financial_accounts!petty_cash_replenishments_source_account_id_fkey(bank_name, account_number)
    `)
    .eq("condominium_id", condominiumId)
    .eq("financial_account_id", accountId)
    .order("replenishment_date", { ascending: false });

  if (error) {
    console.error("Error loading replenishments", error);
    return [];
  }

  return (data || []).map((r: any) => ({
    ...r,
    source_account: Array.isArray(r.source_account) ? r.source_account[0] : r.source_account,
  })) as PettyCashReplenishment[];
}

// ============================================================================
// ACCIONES - VALES
// ============================================================================

export async function createPettyCashVoucher(
  condominiumId: string,
  accountId: string,
  data: {
    amount: number;
    description: string;
    expense_item_id?: string;
    beneficiary?: string;
    voucher_date?: string;
    receipt_url?: string;
  }
) {
  const supabase = await createClient();

  const { data: result, error } = await supabase.rpc("create_petty_cash_voucher", {
    p_condominium_id: condominiumId,
    p_financial_account_id: accountId,
    p_amount: data.amount,
    p_description: data.description,
    p_expense_item_id: data.expense_item_id || null,
    p_beneficiary: data.beneficiary || null,
    p_voucher_date: data.voucher_date || new Date().toISOString().slice(0, 10),
    p_receipt_url: data.receipt_url || null,
    p_created_by: null,
  });

  if (error) {
    console.error("Error creating voucher", error);
    return { error: error.message || "No se pudo crear el vale" };
  }

  const res = result as { success: boolean; error?: string; voucher_id?: string };

  if (!res.success) {
    return { error: res.error || "Error desconocido" };
  }

  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  revalidatePath(`/app/${condominiumId}/financial-accounts/${accountId}`);

  return { success: true, voucherId: res.voucher_id };
}

export async function cancelPettyCashVoucher(
  condominiumId: string,
  voucherId: string,
  reason: string
) {
  const supabase = await createClient();

  const { data: result, error } = await supabase.rpc("cancel_petty_cash_voucher", {
    p_voucher_id: voucherId,
    p_reason: reason,
    p_cancelled_by: null,
  });

  if (error) {
    console.error("Error cancelling voucher", error);
    return { error: error.message || "No se pudo anular el vale" };
  }

  const res = result as { success: boolean; error?: string };

  if (!res.success) {
    return { error: res.error || "Error desconocido" };
  }

  revalidatePath(`/app/${condominiumId}/financial-accounts`);

  return { success: true };
}

// ============================================================================
// ACCIONES - REPOSICIONES
// ============================================================================

export async function createReplenishment(
  condominiumId: string,
  pettyCashAccountId: string,
  sourceAccountId: string,
  notes?: string
) {
  const supabase = await createClient();

  const { data: result, error } = await supabase.rpc("create_petty_cash_replenishment", {
    p_condominium_id: condominiumId,
    p_petty_cash_account_id: pettyCashAccountId,
    p_source_account_id: sourceAccountId,
    p_created_by: null,
    p_notes: notes || null,
  });

  if (error) {
    console.error("Error creating replenishment", error);
    return { error: error.message || "No se pudo crear la reposición" };
  }

  const res = result as {
    success: boolean;
    error?: string;
    replenishment_id?: string;
    total_amount?: number;
    vouchers_count?: number;
  };

  if (!res.success) {
    return { error: res.error || "Error desconocido" };
  }

  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  revalidatePath(`/app/${condominiumId}/financial-accounts/${pettyCashAccountId}`);

  return {
    success: true,
    replenishmentId: res.replenishment_id,
    totalAmount: res.total_amount,
    vouchersCount: res.vouchers_count,
  };
}

export async function executeReplenishment(
  condominiumId: string,
  replenishmentId: string
) {
  const supabase = await createClient();

  const { data: result, error } = await supabase.rpc("execute_petty_cash_replenishment", {
    p_replenishment_id: replenishmentId,
    p_executed_by: null,
  });

  if (error) {
    console.error("Error executing replenishment", error);
    return { error: error.message || "No se pudo ejecutar la reposición" };
  }

  const res = result as { success: boolean; error?: string; transfer_id?: string };

  if (!res.success) {
    return { error: res.error || "Error desconocido" };
  }

  revalidatePath(`/app/${condominiumId}/financial-accounts`);

  return { success: true, transferId: res.transfer_id };
}

// ============================================================================
// ACCIONES - CONFIGURACIÓN
// ============================================================================

export async function updatePettyCashConfig(
  condominiumId: string,
  accountId: string,
  data: {
    max_amount?: number;
    custodian_id?: string | null;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("financial_accounts")
    .update({
      max_amount: data.max_amount,
      custodian_id: data.custodian_id,
      // Actualizar cash_on_hand si se cambia max_amount
      ...(data.max_amount !== undefined && { cash_on_hand: data.max_amount }),
    })
    .eq("id", accountId)
    .eq("condominium_id", condominiumId)
    .eq("account_type", "caja_chica");

  if (error) {
    console.error("Error updating petty cash config", error);
    return { error: "No se pudo actualizar la configuración" };
  }

  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  revalidatePath(`/app/${condominiumId}/financial-accounts/${accountId}`);

  return { success: true };
}

export async function getCustodianOptions(condominiumId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("condominium_id", condominiumId)
    .order("full_name");

  if (error) {
    console.error("Error loading custodians", error);
    return [];
  }

  return data || [];
}

// ============================================================================
// FLUJO SIMPLIFICADO DE CAJA CHICA (OPCIÓN B)
// ============================================================================

export type PettyCashSummary = {
  accountId: string;
  accountName: string;
  totalFunded: number;       // Total de dinero ingresado
  totalExpenses: number;     // Total de gastos (comprobantes)
  availableBalance: number;  // Saldo disponible
  vouchersCount: number;     // Número de comprobantes
  lastFundingDate: string | null;
  lastExpenseDate: string | null;
  custodianName: string | null;
};

// Obtener resumen simplificado de caja chica
export async function getPettyCashSummary(condominiumId: string, accountId: string): Promise<PettyCashSummary | null> {
  const supabase = await createClient();

  // Obtener datos de la cuenta
  const { data: account, error: accountError } = await supabase
    .from("financial_accounts")
    .select(`
      id,
      bank_name,
      current_balance,
      initial_balance,
      custodian:profiles!financial_accounts_custodian_id_fkey(full_name)
    `)
    .eq("id", accountId)
    .eq("condominium_id", condominiumId)
    .eq("account_type", "caja_chica")
    .single();

  if (accountError || !account) {
    console.error("Error loading petty cash account", accountError);
    return null;
  }

  // Calcular total de fondeos (transferencias entrantes + egresos hacia esta cuenta)
  const { data: fundingMovements } = await supabase
    .from("account_movements")
    .select("amount, movement_date")
    .eq("financial_account_id", accountId)
    .eq("condominium_id", condominiumId)
    .in("movement_type", ["ingreso", "transferencia_entrada", "ajuste_positivo"])
    .order("movement_date", { ascending: false });

  const totalFunded = (fundingMovements || []).reduce((sum, m) => sum + Number(m.amount || 0), 0);
  const lastFundingDate = fundingMovements && fundingMovements.length > 0 ? fundingMovements[0].movement_date : null;

  // Calcular total de gastos (comprobantes no anulados)
  const { data: vouchers, count: vouchersCount } = await supabase
    .from("petty_cash_vouchers")
    .select("amount, voucher_date", { count: "exact" })
    .eq("financial_account_id", accountId)
    .eq("condominium_id", condominiumId)
    .neq("status", "anulado")
    .order("voucher_date", { ascending: false });

  const totalExpenses = (vouchers || []).reduce((sum, v) => sum + Number(v.amount || 0), 0);
  const lastExpenseDate = vouchers && vouchers.length > 0 ? vouchers[0].voucher_date : null;

  // Saldo disponible: saldo actual de la cuenta
  const availableBalance = Number(account.current_balance || 0);

  return {
    accountId: account.id,
    accountName: account.bank_name,
    totalFunded: totalFunded + Number(account.initial_balance || 0), // Incluir saldo inicial
    totalExpenses,
    availableBalance,
    vouchersCount: vouchersCount || 0,
    lastFundingDate,
    lastExpenseDate,
    custodianName: (() => {
      const cust = account.custodian as { full_name: string } | { full_name: string }[] | null;
      if (!cust) return null;
      if (Array.isArray(cust)) return cust[0]?.full_name || null;
      return cust.full_name || null;
    })(),
  };
}

// Agregar fondos a caja chica (desde cuenta bancaria via transferencia)
export async function fundPettyCash(
  condominiumId: string,
  pettyCashAccountId: string,
  sourceAccountId: string,
  amount: number,
  description?: string,
  referenceDate?: string
) {
  const supabase = await createClient();

  // Validar que ambas cuentas pertenecen al condominio
  const { data: accounts } = await supabase
    .from("financial_accounts")
    .select("id, account_type")
    .eq("condominium_id", condominiumId)
    .in("id", [pettyCashAccountId, sourceAccountId]);

  if (!accounts || accounts.length !== 2) {
    return { error: "Las cuentas no pertenecen a este condominio" };
  }

  const pettyCash = accounts.find(a => a.id === pettyCashAccountId);
  const source = accounts.find(a => a.id === sourceAccountId);

  if (pettyCash?.account_type !== "caja_chica") {
    return { error: "La cuenta destino no es una caja chica" };
  }

  if (source?.account_type === "caja_chica") {
    return { error: "No puedes transferir desde otra caja chica" };
  }

  // Usar la función de transferencia existente
  const { data, error } = await supabase.rpc("transfer_between_accounts", {
    p_from_account_id: sourceAccountId,
    p_to_account_id: pettyCashAccountId,
    p_amount: amount,
    p_description: description || "Fondeo de caja chica",
    p_reference_number: null,
    p_transfer_date: referenceDate || new Date().toISOString().slice(0, 10),
    p_created_by: null,
  });

  if (error) {
    console.error("Error fondeando caja chica", error);
    return { error: error.message || "No se pudo fondear la caja chica" };
  }

  const result = data as { success: boolean; error?: string; transfer_id?: string };

  if (!result.success) {
    return { error: result.error || "Error desconocido" };
  }

  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  revalidatePath(`/app/${condominiumId}/financial-accounts/${pettyCashAccountId}`);
  revalidatePath(`/app/${condominiumId}/financial-accounts/${sourceAccountId}`);

  return { success: true, transferId: result.transfer_id };
}

// Crear comprobante de gasto simplificado (sin requerir período abierto)
export async function createSimpleExpense(
  condominiumId: string,
  accountId: string,
  data: {
    amount: number;
    description: string;
    expense_item_id?: string;
    beneficiary?: string;
    expense_date?: string;
    receipt_url?: string;
  }
) {
  const supabase = await createClient();

  // Validar que es una caja chica
  const { data: account } = await supabase
    .from("financial_accounts")
    .select("id, account_type, current_balance")
    .eq("id", accountId)
    .eq("condominium_id", condominiumId)
    .eq("account_type", "caja_chica")
    .single();

  if (!account) {
    return { error: "Cuenta de caja chica no encontrada" };
  }

  // Validar saldo suficiente
  if (data.amount > Number(account.current_balance || 0)) {
    return { error: `Saldo insuficiente. Disponible: $${Number(account.current_balance || 0).toFixed(2)}` };
  }

  // Obtener siguiente número de comprobante
  const { data: lastVoucher } = await supabase
    .from("petty_cash_vouchers")
    .select("voucher_number")
    .eq("condominium_id", condominiumId)
    .eq("financial_account_id", accountId)
    .order("voucher_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = (lastVoucher?.voucher_number || 0) + 1;
  const expenseDate = data.expense_date || new Date().toISOString().slice(0, 10);

  // Crear el comprobante
  const { data: voucher, error: voucherError } = await supabase
    .from("petty_cash_vouchers")
    .insert({
      condominium_id: condominiumId,
      financial_account_id: accountId,
      voucher_number: nextNumber,
      voucher_date: expenseDate,
      amount: data.amount,
      description: data.description,
      expense_item_id: data.expense_item_id || null,
      beneficiary: data.beneficiary || null,
      receipt_url: data.receipt_url || null,
      status: "pendiente", // Pendiente de reposición
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (voucherError || !voucher) {
    console.error("Error creando comprobante", voucherError);
    return { error: "No se pudo crear el comprobante" };
  }

  // Actualizar saldo de la caja chica (restar el gasto)
  const newBalance = Number(account.current_balance || 0) - data.amount;
  await supabase
    .from("financial_accounts")
    .update({ current_balance: newBalance })
    .eq("id", accountId)
    .eq("condominium_id", condominiumId);

  // Registrar movimiento de egreso
  await supabase.from("account_movements").insert({
    condominium_id: condominiumId,
    financial_account_id: accountId,
    movement_type: "egreso",
    amount: -data.amount,
    balance_before: account.current_balance,
    balance_after: newBalance,
    description: `Comprobante #${nextNumber}: ${data.description}`,
    movement_date: expenseDate,
    created_at: new Date().toISOString(),
  });

  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  revalidatePath(`/app/${condominiumId}/financial-accounts/${accountId}`);

  return { success: true, voucherId: voucher.id, voucherNumber: nextNumber };
}

// Obtener datos para el reporte de caja chica
export type PettyCashReportData = {
  account: {
    name: string;
    custodian: string | null;
    initialBalance: number;
    currentBalance: number;
  };
  period: {
    from: string;
    to: string;
  };
  fundings: Array<{
    date: string;
    amount: number;
    description: string;
    source: string | null;
  }>;
  expenses: Array<{
    number: number;
    date: string;
    amount: number;
    description: string;
    beneficiary: string | null;
    expenseItem: string | null;
    status: string;
  }>;
  totals: {
    totalFundings: number;
    totalExpenses: number;
    balance: number;
  };
};

export async function getPettyCashReportData(
  condominiumId: string,
  accountId: string,
  from?: string,
  to?: string
): Promise<PettyCashReportData | null> {
  const supabase = await createClient();

  // Obtener datos de la cuenta
  const { data: account } = await supabase
    .from("financial_accounts")
    .select(`
      bank_name,
      initial_balance,
      current_balance,
      custodian:profiles!financial_accounts_custodian_id_fkey(full_name)
    `)
    .eq("id", accountId)
    .eq("condominium_id", condominiumId)
    .single();

  if (!account) return null;

  // Definir período de fechas
  const today = new Date().toISOString().slice(0, 10);
  const periodFrom = from || "2000-01-01";
  const periodTo = to || today;

  // Obtener fondeos (movimientos de entrada)
  let fundingsQuery = supabase
    .from("account_movements")
    .select("movement_date, amount, description")
    .eq("financial_account_id", accountId)
    .eq("condominium_id", condominiumId)
    .in("movement_type", ["ingreso", "transferencia_entrada", "ajuste_positivo"])
    .gte("movement_date", periodFrom)
    .lte("movement_date", periodTo)
    .order("movement_date");

  const { data: fundingMovements } = await fundingsQuery;

  // Obtener gastos (comprobantes)
  let expensesQuery = supabase
    .from("petty_cash_vouchers")
    .select(`
      voucher_number,
      voucher_date,
      amount,
      description,
      beneficiary,
      status,
      expense_item:expense_items(name)
    `)
    .eq("financial_account_id", accountId)
    .eq("condominium_id", condominiumId)
    .neq("status", "anulado")
    .gte("voucher_date", periodFrom)
    .lte("voucher_date", periodTo)
    .order("voucher_number");

  const { data: voucherData } = await expensesQuery;

  // Procesar datos
  const fundings = (fundingMovements || []).map(m => ({
    date: m.movement_date,
    amount: Math.abs(Number(m.amount || 0)),
    description: m.description || "Fondeo",
    source: null,
  }));

  const expenses = (voucherData || []).map((v: any) => ({
    number: v.voucher_number,
    date: v.voucher_date,
    amount: Number(v.amount || 0),
    description: v.description,
    beneficiary: v.beneficiary,
    expenseItem: Array.isArray(v.expense_item) ? v.expense_item[0]?.name : v.expense_item?.name || null,
    status: v.status,
  }));

  const totalFundings = fundings.reduce((sum, f) => sum + f.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Normalizar custodian
  const custodianData = account.custodian as { full_name: string } | { full_name: string }[] | null;
  const custodianName = custodianData
    ? Array.isArray(custodianData)
      ? custodianData[0]?.full_name || null
      : custodianData.full_name || null
    : null;

  return {
    account: {
      name: account.bank_name,
      custodian: custodianName,
      initialBalance: Number(account.initial_balance || 0),
      currentBalance: Number(account.current_balance || 0),
    },
    period: {
      from: periodFrom,
      to: periodTo,
    },
    fundings,
    expenses,
    totals: {
      totalFundings,
      totalExpenses,
      balance: Number(account.current_balance || 0),
    },
  };
}

export async function getExpenseItemsForVouchers(condominiumId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expense_items")
    .select("id, name")
    .eq("condominium_id", condominiumId)
    .eq("category", "egreso")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error loading expense items", error);
    return [];
  }

  return data || [];
}

export async function getBankAccountsForReplenishment(condominiumId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("financial_accounts")
    .select("id, bank_name, account_number, current_balance")
    .eq("condominium_id", condominiumId)
    .eq("is_active", true)
    .neq("account_type", "caja_chica")
    .order("bank_name");

  if (error) {
    console.error("Error loading bank accounts", error);
    return [];
  }

  return data || [];
}

// ============================================================================
// PERÍODOS DE CAJA CHICA
// ============================================================================

export type PettyCashPeriod = {
  id: string;
  condominium_id: string;
  financial_account_id: string;
  period_number: number;
  status: "abierto" | "cerrado";
  opened_at: string;
  opening_amount: number;
  closed_at: string | null;
  physical_cash: number | null;
  total_vouchers_amount: number | null;
  vouchers_count: number | null;
  difference_amount: number | null;
  difference_type: "exacto" | "sobrante" | "faltante" | null;
  difference_notes: string | null;
  suggested_next_opening: number | null;
};

export type PeriodStatus = {
  success: boolean;
  has_open_period: boolean;
  period?: {
    id: string;
    period_number: number;
    opened_at: string;
    opening_amount: number;
    total_vouchers: number;
    vouchers_count: number;
    expected_cash: number;
    cash_on_hand: number;
  };
  last_closed_period?: {
    id: string;
    period_number: number;
    closed_at: string;
    difference_type: string;
    difference_amount: number;
    suggested_next_opening: number;
  } | null;
  max_amount: number;
  suggested_opening?: number;
};

export async function getPeriodStatus(condominiumId: string, accountId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_petty_cash_period_status", {
    p_account_id: accountId,
  });

  if (error) {
    console.error("Error getting period status", error);
    return null;
  }

  return data as PeriodStatus;
}

export async function getPettyCashPeriods(condominiumId: string, accountId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("petty_cash_periods")
    .select("*")
    .eq("condominium_id", condominiumId)
    .eq("financial_account_id", accountId)
    .order("period_number", { ascending: false });

  if (error) {
    console.error("Error loading periods", error);
    return [];
  }

  return (data || []) as PettyCashPeriod[];
}

export async function openPettyCashPeriod(
  condominiumId: string,
  accountId: string,
  openingAmount: number
) {
  const supabase = await createClient();

  const { data: result, error } = await supabase.rpc("open_petty_cash_period", {
    p_condominium_id: condominiumId,
    p_account_id: accountId,
    p_opening_amount: openingAmount,
    p_opened_by: null,
  });

  if (error) {
    console.error("Error opening period", error);
    return { error: error.message || "No se pudo abrir el período" };
  }

  const res = result as {
    success: boolean;
    error?: string;
    period_id?: string;
    period_number?: number;
  };

  if (!res.success) {
    return { error: res.error || "Error desconocido" };
  }

  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  revalidatePath(`/app/${condominiumId}/financial-accounts/${accountId}`);

  return {
    success: true,
    periodId: res.period_id,
    periodNumber: res.period_number,
  };
}

export async function closePettyCashPeriod(
  condominiumId: string,
  accountId: string,
  physicalCash: number,
  notes?: string
) {
  const supabase = await createClient();

  const { data: result, error } = await supabase.rpc("close_petty_cash_period", {
    p_condominium_id: condominiumId,
    p_account_id: accountId,
    p_physical_cash: physicalCash,
    p_difference_notes: notes || null,
    p_closed_by: null,
  });

  if (error) {
    console.error("Error closing period", error);
    return { error: error.message || "No se pudo cerrar el período" };
  }

  const res = result as {
    success: boolean;
    error?: string;
    period_id?: string;
    total_vouchers?: number;
    vouchers_count?: number;
    expected_cash?: number;
    physical_cash?: number;
    difference?: number;
    difference_type?: string;
    suggested_next_opening?: number;
  };

  if (!res.success) {
    return { error: res.error || "Error desconocido" };
  }

  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  revalidatePath(`/app/${condominiumId}/financial-accounts/${accountId}`);

  return {
    success: true,
    periodId: res.period_id,
    totalVouchers: res.total_vouchers,
    vouchersCount: res.vouchers_count,
    expectedCash: res.expected_cash,
    physicalCash: res.physical_cash,
    difference: res.difference,
    differenceType: res.difference_type,
    suggestedNextOpening: res.suggested_next_opening,
  };
}

export async function getSuggestedOpeningAmount(accountId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_suggested_opening_amount", {
    p_account_id: accountId,
  });

  if (error) {
    console.error("Error getting suggested amount", error);
    return null;
  }

  return data as number;
}

// ============================================================================
// ELIMINAR PERÍODO VACÍO
// ============================================================================

export async function canDeletePeriod(condominiumId: string, periodId: string) {
  const supabase = await createClient();

  // Obtener el período
  const { data: period, error: periodError } = await supabase
    .from("petty_cash_periods")
    .select("id, status, financial_account_id, period_number")
    .eq("id", periodId)
    .eq("condominium_id", condominiumId)
    .single();

  if (periodError || !period) {
    return { canDelete: false, reason: "Período no encontrado" };
  }

  // Verificar si tiene comprobantes asociados (no anulados)
  const { count, error: vouchersError } = await supabase
    .from("petty_cash_vouchers")
    .select("id", { count: "exact", head: true })
    .eq("condominium_id", condominiumId)
    .eq("financial_account_id", period.financial_account_id)
    .neq("status", "anulado");

  if (vouchersError) {
    console.error("Error checking vouchers", vouchersError);
    return { canDelete: false, reason: "Error al verificar comprobantes" };
  }

  // Si hay comprobantes pendientes o repuestos, no se puede eliminar
  if (count && count > 0) {
    return {
      canDelete: false,
      reason: `El período tiene ${count} comprobante(s) activo(s). Anúlalos primero si deseas eliminar el período.`,
    };
  }

  return { canDelete: true, periodNumber: period.period_number, status: period.status };
}

export async function deletePettyCashPeriod(condominiumId: string, periodId: string) {
  const supabase = await createClient();

  // Verificar que se puede eliminar
  const check = await canDeletePeriod(condominiumId, periodId);
  if (!check.canDelete) {
    return { error: check.reason };
  }

  // Obtener el account_id antes de eliminar
  const { data: period } = await supabase
    .from("petty_cash_periods")
    .select("financial_account_id")
    .eq("id", periodId)
    .single();

  const accountId = period?.financial_account_id;

  // Eliminar el período
  const { error } = await supabase
    .from("petty_cash_periods")
    .delete()
    .eq("id", periodId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("Error deleting period", error);
    return { error: "No se pudo eliminar el período" };
  }

  // Resetear cash_on_hand a 0 ya que no hay período abierto
  if (accountId) {
    await supabase
      .from("financial_accounts")
      .update({ cash_on_hand: 0 })
      .eq("id", accountId)
      .eq("condominium_id", condominiumId);
  }

  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  if (accountId) {
    revalidatePath(`/app/${condominiumId}/financial-accounts/${accountId}`);
  }

  return { success: true };
}

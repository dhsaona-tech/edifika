"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Sanitizar búsquedas para prevenir SQL injection en PostgREST
function sanitizeSearch(input: string | undefined | null): string {
  if (!input) return "";
  // Eliminar caracteres especiales de PostgREST/SQL
  return input.replace(/[%_*(),.\\'";\n\r\t]/g, "").trim().slice(0, 100);
}

const AccountSchema = z.object({
  bank_name: z.string().min(1, "Nombre requerido"),
  account_number: z.string().min(1, "Numero requerido"),
  account_type: z.enum(["corriente", "ahorros", "caja_chica"]),
  initial_balance: z.coerce.number(),
  current_balance: z.coerce.number().optional(),
  is_active: z.boolean().default(true),
  uses_checks: z.boolean().default(false),
});

const CheckbookSchema = z.object({
  start_number: z.coerce.number().int().min(1),
  end_number: z.coerce.number().int().min(1),
  notes: z.string().optional().or(z.literal("")),
});

export async function getFinancialAccounts(
  condominiumId: string,
  filters?: { q?: string; type?: string; state?: string }
) {
  const supabase = await createClient();
  let query = supabase
    .from("financial_accounts")
    .select("*")
    .eq("condominium_id", condominiumId)
    .order("bank_name");

  if (filters?.q) {
    const safeQ = sanitizeSearch(filters.q);
    if (safeQ) {
      query = query.or(
        `bank_name.ilike.%${safeQ}%,account_number.ilike.%${safeQ}%`
      );
    }
  }
  if (filters?.type && filters.type !== "all") {
    query = query.eq("account_type", filters.type);
  }
  if (filters?.state === "active") query = query.eq("is_active", true);
  if (filters?.state === "inactive") query = query.eq("is_active", false);

  const { data, error } = await query;
  if (error) {
    console.error("Error loading accounts", error);
    return [];
  }
  return data || [];
}

export async function getFinancialAccountById(condominiumId: string, accountId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("financial_accounts")
    .select(`
      *,
      custodian:profiles!financial_accounts_custodian_id_fkey(id, full_name)
    `)
    .eq("id", accountId)
    .eq("condominium_id", condominiumId)
    .single();

  if (!data) return null;

  // Normalizar el custodian (puede venir como array)
  return {
    ...data,
    custodian: Array.isArray(data.custodian) ? data.custodian[0] : data.custodian,
  };
}

export async function createFinancialAccount(condominiumId: string, formData: FormData) {
  const parsed = AccountSchema.safeParse({
    bank_name: formData.get("bank_name"),
    account_number: formData.get("account_number"),
    account_type: formData.get("account_type"),
    initial_balance: formData.get("initial_balance"),
    current_balance: formData.get("current_balance"),
    is_active: formData.get("is_active") === "on",
    uses_checks: formData.get("uses_checks") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const payload = parsed.data.account_type === "corriente"
    ? parsed.data
    : { ...parsed.data, uses_checks: false };

  if (!payload.current_balance) payload.current_balance = payload.initial_balance;

  const supabase = await createClient();
  const { error } = await supabase.from("financial_accounts").insert({
    condominium_id: condominiumId,
    ...payload,
  });
  if (error) return { error: "No se pudo guardar la cuenta" };

  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  return { success: true };
}

export async function updateFinancialAccount(
  condominiumId: string,
  accountId: string,
  formData: FormData
) {
  const parsed = AccountSchema.safeParse({
    bank_name: formData.get("bank_name"),
    account_number: formData.get("account_number"),
    account_type: formData.get("account_type"),
    initial_balance: formData.get("initial_balance"),
    current_balance: formData.get("current_balance"),
    is_active: formData.get("is_active") === "on",
    uses_checks: formData.get("uses_checks") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const payload =
    parsed.data.account_type === "corriente"
      ? parsed.data
      : { ...parsed.data, uses_checks: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_accounts")
    .update(payload)
    .eq("id", accountId)
    .eq("condominium_id", condominiumId);

  if (error) return { error: "No se pudo actualizar" };
  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  revalidatePath(`/app/${condominiumId}/financial-accounts/${accountId}`);
  return { success: true };
}

export async function canDeleteFinancialAccount(condominiumId: string, accountId: string) {
  const supabase = await createClient();
  const blockers: string[] = [];

  // 1. Verificar que la cuenta existe y pertenece al condominio
  const { data: account } = await supabase
    .from("financial_accounts")
    .select("id, bank_name, account_type")
    .eq("id", accountId)
    .eq("condominium_id", condominiumId)
    .single();

  if (!account) {
    return { canDelete: false, blockers: ["Cuenta no encontrada"] };
  }

  // 2. Verificar movimientos (ingresos, egresos, transferencias, ajustes)
  const { count: movementsCount } = await supabase
    .from("account_movements")
    .select("id", { count: "exact", head: true })
    .eq("financial_account_id", accountId);

  if (movementsCount && movementsCount > 0) {
    blockers.push(`Tiene ${movementsCount} movimiento(s) registrado(s)`);
  }

  // 3. Verificar pagos asociados
  const { count: paymentsCount } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("financial_account_id", accountId);

  if (paymentsCount && paymentsCount > 0) {
    blockers.push(`Tiene ${paymentsCount} pago(s) registrado(s)`);
  }

  // 4. Verificar egresos asociados
  const { count: egressesCount } = await supabase
    .from("egresses")
    .select("id", { count: "exact", head: true })
    .eq("financial_account_id", accountId);

  if (egressesCount && egressesCount > 0) {
    blockers.push(`Tiene ${egressesCount} egreso(s) registrado(s)`);
  }

  // 5. Si es caja chica, verificar comprobantes (no anulados)
  // Los períodos vacíos (sin comprobantes) se pueden eliminar
  if (account.account_type === "caja_chica") {
    const { count: vouchersCount } = await supabase
      .from("petty_cash_vouchers")
      .select("id", { count: "exact", head: true })
      .eq("financial_account_id", accountId)
      .neq("status", "anulado");

    if (vouchersCount && vouchersCount > 0) {
      blockers.push(`Tiene ${vouchersCount} comprobante(s) de caja chica`);
    }
  }

  // 6. Verificar cheques usados (no disponibles)
  const { count: usedChecksCount } = await supabase
    .from("checks")
    .select("id", { count: "exact", head: true })
    .eq("financial_account_id", accountId)
    .neq("status", "disponible");

  if (usedChecksCount && usedChecksCount > 0) {
    blockers.push(`Tiene ${usedChecksCount} cheque(s) usado(s) o anulado(s)`);
  }

  return {
    canDelete: blockers.length === 0,
    blockers,
    accountName: account.bank_name,
  };
}

export async function deleteFinancialAccount(condominiumId: string, accountId: string) {
  const supabase = await createClient();

  // Verificar primero si se puede eliminar
  const { canDelete, blockers } = await canDeleteFinancialAccount(condominiumId, accountId);

  if (!canDelete) {
    return {
      error: `No se puede eliminar: ${blockers.join(", ")}`,
      blockers,
    };
  }

  // Soft-delete: desactivar cheques disponibles
  await supabase
    .from("checks")
    .update({ status: "anulado" })
    .eq("financial_account_id", accountId)
    .eq("status", "disponible");

  // Soft-delete: desactivar chequeras
  await supabase
    .from("checkbooks")
    .update({ is_active: false })
    .eq("financial_account_id", accountId);

  // Soft-delete: cerrar períodos de caja chica abiertos
  await supabase
    .from("petty_cash_periods")
    .update({ status: "cerrado" })
    .eq("financial_account_id", accountId)
    .eq("status", "abierto");

  // Soft-delete la cuenta (desactivar)
  const { error } = await supabase
    .from("financial_accounts")
    .update({ is_active: false })
    .eq("id", accountId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("Error deactivating account", error);
    return { error: "No se pudo desactivar la cuenta" };
  }

  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  return { success: true };
}

export async function getCheckbooks(condominiumId: string, accountId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkbooks")
    .select("*, financial_accounts!inner(condominium_id)")
    .eq("financial_account_id", accountId)
    .eq("financial_accounts.condominium_id", condominiumId)
    .order("start_number");
  if (error) return [];
  return data || [];
}

export async function createCheckbook(
  condominiumId: string,
  accountId: string,
  formData: FormData
) {
  const parsed = CheckbookSchema.safeParse({
    start_number: formData.get("start_number"),
    end_number: formData.get("end_number"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.start_number > parsed.data.end_number) {
    return { error: "El inicio debe ser menor o igual al fin" };
  }

  const supabase = await createClient();

  const { data: overlap } = await supabase
    .from("checkbooks")
    .select("id,start_number,end_number")
    .eq("financial_account_id", accountId)
    .lte("start_number", parsed.data.end_number)
    .gte("end_number", parsed.data.start_number)
    .maybeSingle();

  if (overlap) {
    return { error: "El rango se solapa con una chequera existente" };
  }

  const { data, error } = await supabase
    .from("checkbooks")
    .insert({
      financial_account_id: accountId,
      start_number: parsed.data.start_number,
      end_number: parsed.data.end_number,
      current_number: parsed.data.start_number,
      notes: parsed.data.notes || null,
      is_active: true,
    })
    .select("id, start_number, end_number")
    .single();

  if (error || !data) return { error: "No se pudo crear la chequera" };

  // Helper listo para activar en siguiente etapa
  await generateChecksForCheckbook(accountId, data.id, data.start_number, data.end_number);

  revalidatePath(`/app/${condominiumId}/financial-accounts/${accountId}`);
  return { success: true };
}

export async function generateChecksForCheckbook(
  accountId: string,
  checkbookId: string,
  start: number,
  end: number
) {
  const supabase = await createClient();
  const checks = Array.from({ length: end - start + 1 }, (_, idx) => ({
    financial_account_id: accountId,
    checkbook_id: checkbookId,
    check_number: start + idx,
    status: "disponible",
  }));
  const { error } = await supabase.from("checks").insert(checks);
  if (error) console.error("No se pudieron generar cheques", error);
}

export async function getChecks(condominiumId: string, accountId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checks")
    .select(`
      *,
      checkbook:checkbooks(start_number,end_number),
      financial_accounts!inner(condominium_id)
    `)
    .eq("financial_account_id", accountId)
    .eq("financial_accounts.condominium_id", condominiumId)
    .order("check_number");
  if (error) return [];
  return data || [];
}

export async function updateCheckStatus(
  condominiumId: string,
  checkId: string,
  status: "disponible" | "usado" | "anulado" | "perdido",
  notes?: string
) {
  const supabase = await createClient();

  // Verificar que el cheque pertenece a una cuenta del condominio
  const { data: check } = await supabase
    .from("checks")
    .select("id, financial_account_id, financial_accounts!inner(condominium_id)")
    .eq("id", checkId)
    .eq("financial_accounts.condominium_id", condominiumId)
    .maybeSingle();

  if (!check) {
    return { error: "Cheque no encontrado o no pertenece a este condominio" };
  }

  const { error } = await supabase
    .from("checks")
    .update({ status, notes: notes || null })
    .eq("id", checkId);
  if (error) return { error: "No se pudo actualizar el estado" };
  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  return { success: true };
}

// ============================================================================
// MOVIMIENTOS Y TRANSFERENCIAS
// ============================================================================

export type AccountMovement = {
  id: string;
  financial_account_id: string;
  condominium_id: string;
  movement_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  payment_id: string | null;
  egress_id: string | null;
  transfer_id: string | null;
  description: string | null;
  reference_number: string | null;
  movement_date: string;
  created_at: string;
  created_by: string | null;
};

export async function getAccountMovements(
  condominiumId: string,
  accountId: string,
  filters?: { from?: string; to?: string; type?: string; limit?: number }
) {
  const supabase = await createClient();
  let query = supabase
    .from("account_movements")
    .select("*")
    .eq("financial_account_id", accountId)
    .eq("condominium_id", condominiumId)
    .order("created_at", { ascending: false });

  if (filters?.from) {
    query = query.gte("movement_date", filters.from);
  }
  if (filters?.to) {
    query = query.lte("movement_date", filters.to);
  }
  if (filters?.type && filters.type !== "all") {
    query = query.eq("movement_type", filters.type);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error loading account movements", error);
    return [];
  }
  return data || [];
}

export async function getAllMovements(
  condominiumId: string,
  filters?: { from?: string; to?: string; accountId?: string; type?: string; limit?: number }
) {
  const supabase = await createClient();
  let query = supabase
    .from("account_movements")
    .select(`
      *,
      financial_account:financial_accounts(id, bank_name, account_number)
    `)
    .eq("condominium_id", condominiumId)
    .order("created_at", { ascending: false });

  if (filters?.from) {
    query = query.gte("movement_date", filters.from);
  }
  if (filters?.to) {
    query = query.lte("movement_date", filters.to);
  }
  if (filters?.accountId) {
    query = query.eq("financial_account_id", filters.accountId);
  }
  if (filters?.type && filters.type !== "all") {
    query = query.eq("movement_type", filters.type);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error loading all movements", error);
    return [];
  }
  return data || [];
}

export async function transferBetweenAccounts(
  condominiumId: string,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  description?: string,
  referenceNumber?: string,
  transferDate?: string
) {
  const supabase = await createClient();

  // Verificar que ambas cuentas pertenecen al condominio
  const { data: accounts } = await supabase
    .from("financial_accounts")
    .select("id")
    .eq("condominium_id", condominiumId)
    .in("id", [fromAccountId, toAccountId]);

  if (!accounts || accounts.length !== 2) {
    return { error: "Las cuentas no pertenecen a este condominio" };
  }

  const { data, error } = await supabase.rpc("transfer_between_accounts", {
    p_from_account_id: fromAccountId,
    p_to_account_id: toAccountId,
    p_amount: amount,
    p_description: description || "Transferencia entre cuentas",
    p_reference_number: referenceNumber || null,
    p_transfer_date: transferDate || new Date().toISOString().slice(0, 10),
    p_created_by: null,
  });

  if (error) {
    console.error("Error en transferencia", error);
    return { error: error.message || "No se pudo realizar la transferencia" };
  }

  const result = data as { success: boolean; error?: string; transfer_id?: string };

  if (!result.success) {
    return { error: result.error || "Error desconocido en transferencia" };
  }

  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  revalidatePath(`/app/${condominiumId}/financial-accounts/${fromAccountId}`);
  revalidatePath(`/app/${condominiumId}/financial-accounts/${toAccountId}`);

  return { success: true, transferId: result.transfer_id };
}

export async function adjustAccountBalance(
  condominiumId: string,
  accountId: string,
  adjustmentAmount: number,
  reason: string
) {
  const supabase = await createClient();

  // Verificar que la cuenta pertenece al condominio
  const { data: account } = await supabase
    .from("financial_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!account) {
    return { error: "Cuenta no encontrada" };
  }

  const { data, error } = await supabase.rpc("adjust_account_balance", {
    p_financial_account_id: accountId,
    p_adjustment_amount: adjustmentAmount,
    p_reason: reason,
    p_adjusted_by: null,
  });

  if (error) {
    console.error("Error en ajuste", error);
    return { error: error.message || "No se pudo realizar el ajuste" };
  }

  const result = data as { success: boolean; error?: string; movement_id?: string };

  if (!result.success) {
    return { error: result.error || "Error desconocido en ajuste" };
  }

  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  revalidatePath(`/app/${condominiumId}/financial-accounts/${accountId}`);

  return { success: true, movementId: result.movement_id };
}

export async function getAccountBalanceSummary(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_account_balance_summary")
    .select("*")
    .eq("condominium_id", condominiumId)
    .order("bank_name");

  if (error) {
    console.error("Error loading balance summary", error);
    return [];
  }
  return data || [];
}

// ============================================================================
// CAJA CHICA - CREACIÓN ESPECÍFICA
// ============================================================================

const PettyCashSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  initial_amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  custodian_id: z.string().optional().nullable(),
});

export async function createPettyCashAccount(
  condominiumId: string,
  data: {
    name: string;
    initial_amount: number;
    custodian_id?: string | null;
  }
) {
  const parsed = PettyCashSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  // Generar un identificador único para caja chica (no necesita número de cuenta)
  const identifier = `CC-${Date.now().toString(36).toUpperCase()}`;

  const { data: account, error } = await supabase
    .from("financial_accounts")
    .insert({
      condominium_id: condominiumId,
      bank_name: parsed.data.name,
      account_number: identifier, // Identificador interno autogenerado
      account_type: "caja_chica",
      initial_balance: parsed.data.initial_amount, // El monto con el que se abre la caja
      current_balance: 0, // Empieza en 0, se actualiza al abrir período
      max_amount: parsed.data.initial_amount, // Referencia del monto estándar
      cash_on_hand: 0,
      custodian_id: parsed.data.custodian_id || null,
      is_active: true,
      uses_checks: false,
    })
    .select("id")
    .single();

  if (error || !account) {
    console.error("Error creating petty cash account", error);
    return { error: "No se pudo crear la caja chica" };
  }

  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  return { success: true, accountId: account.id };
}

export async function getCustodianOptions(condominiumId: string) {
  const supabase = await createClient();

  // Solo administradores pueden ser custodios de caja chica
  const { data, error } = await supabase
    .from("memberships")
    .select(`
      profile_id,
      role,
      profiles!inner(id, full_name)
    `)
    .eq("condominium_id", condominiumId)
    .in("role", ["admin", "superadmin", "ADMIN", "SUPER_ADMIN"]);

  if (error) {
    console.error("Error loading custodians", error);
    return [];
  }

  // Filtrar duplicados (un admin podría tener múltiples memberships)
  const uniqueProfiles = new Map<string, { id: string; full_name: string }>();
  (data || []).forEach((m: any) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    if (profile && profile.id && !uniqueProfiles.has(profile.id)) {
      uniqueProfiles.set(profile.id, {
        id: profile.id,
        full_name: profile.full_name || "Sin nombre",
      });
    }
  });

  return Array.from(uniqueProfiles.values()).sort((a, b) =>
    (a.full_name || "").localeCompare(b.full_name || "")
  );
}

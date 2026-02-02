"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
    query = query.or(
      `bank_name.ilike.%${filters.q}%,account_number.ilike.%${filters.q}%`
    );
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

export async function getFinancialAccountById(accountId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("financial_accounts")
    .select("*")
    .eq("id", accountId)
    .single();
  return data || null;
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
    .eq("id", accountId);

  if (error) return { error: "No se pudo actualizar" };
  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  revalidatePath(`/app/${condominiumId}/financial-accounts/${accountId}`);
  return { success: true };
}

export async function getCheckbooks(accountId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkbooks")
    .select("*")
    .eq("financial_account_id", accountId)
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

export async function getChecks(accountId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checks")
    .select(`
      *,
      checkbook:checkbooks(start_number,end_number)
    `)
    .eq("financial_account_id", accountId)
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
  const { error } = await supabase
    .from("checks")
    .update({ status, notes: notes || null })
    .eq("id", checkId);
  if (error) return { error: "No se pudo actualizar el estado" };
  revalidatePath(`/app/${condominiumId}/financial-accounts`);
  return { success: true };
}

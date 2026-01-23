"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type EgressFilters = {
  status?: string;
  accountId?: string;
  supplierId?: string;
  method?: string;
  from?: string;
  to?: string;
  search?: string;
  date?: string;
};

const bucketUsed = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_ATTACHMENTS || "pdfs";
const normalizePdfUrl = (url?: string | null) => (url && url.includes(`/${bucketUsed}/`) ? url : null);

export async function listEgresses(condominiumId: string, filters?: EgressFilters) {
  const supabase = await createClient();
  let query = supabase
    .from("egresses")
    .select("*")
    .eq("condominium_id", condominiumId)
    .order("payment_date", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.accountId) query = query.eq("financial_account_id", filters.accountId);
  if (filters?.supplierId) query = query.eq("supplier_id", filters.supplierId);
  if (filters?.method) query = query.eq("payment_method", filters.method);
  if (filters?.from) query = query.gte("payment_date", filters.from);
  if (filters?.to) query = query.lte("payment_date", filters.to);
  if (filters?.date) {
    query = query.gte("payment_date", filters.date).lte("payment_date", filters.date);
  }
  if (filters?.search) {
    query = query.or(
      [
        `reference_number.ilike.%${filters.search}%`,
        `notes.ilike.%${filters.search}%`,
      ].join(",")
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error listando egresos", error);
    return [];
  }
  const egresses = data || [];
  const supplierIds = egresses.map((e) => e.supplier_id).filter(Boolean) as string[];
  const accountIds = egresses.map((e) => e.financial_account_id).filter(Boolean) as string[];

  const [suppliersRes, accountsRes] = await Promise.all([
    supplierIds.length
      ? supabase.from("suppliers").select("id, name, fiscal_id, bank_name, bank_account_number").in("id", supplierIds)
      : Promise.resolve({ data: [] as any[] }),
    accountIds.length
      ? supabase.from("financial_accounts").select("id, bank_name, account_number").in("id", accountIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const supplierMap = new Map<string, any>();
  const accountMap = new Map<string, any>();
  (suppliersRes.data || []).forEach((s) => supplierMap.set(s.id, s));
  (accountsRes.data || []).forEach((a) => accountMap.set(a.id, a));

  return egresses.map((e) => {
    const allocated = Number(e.total_allocated_amount || 0);
    const total = Number(e.total_amount || 0);
    const derivedStatus =
      (e.status || "").toLowerCase() === "anulado"
        ? "anulado"
        : allocated >= total - 0.009
          ? "pagado"
          : allocated > 0.009
            ? "parcialmente_pagado"
            : "emitido";
    return {
      ...e,
      pdf_url: normalizePdfUrl(e.pdf_url),
      supplier: supplierMap.get(e.supplier_id) || null,
      account: accountMap.get(e.financial_account_id) || null,
      derivedStatus,
    };
  });
}

export async function getEgressDetail(condominiumId: string, egressId: string) {
  const supabase = await createClient();
  const { data: egress, error } = await supabase
    .from("egresses")
    .select("*")
    .eq("id", egressId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();
  if (error || !egress) {
    console.error("Error leyendo egreso", error);
    return null;
  }

  const [supplierRes, accountRes, allocationsRes] = await Promise.all([
    egress.supplier_id
      ? supabase.from("suppliers").select("id, name, contact_person, phone, email, bank_name, bank_account_number").eq("id", egress.supplier_id).maybeSingle()
      : Promise.resolve({ data: null }),
    egress.financial_account_id
      ? supabase.from("financial_accounts").select("id, bank_name, account_number").eq("id", egress.financial_account_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("egress_allocations")
      .select(
        `
        id,
        amount_allocated,
        payable:payable_orders(
          id,
          invoice_number,
          issue_date,
          due_date,
          total_amount,
          paid_amount,
          description,
          expense_item:expense_items(name),
          invoice_file_url
        )
      `
      )
      .eq("egress_id", egressId),
  ]);

  return {
    ...egress,
    pdf_url: normalizePdfUrl(egress.pdf_url),
    supplier: supplierRes.data || null,
    account: accountRes.data || null,
    allocations: allocationsRes.data || [],
  };
}

export async function cancelEgress(condominiumId: string, egressId: string, reason: string) {
  const supabase = await createClient();
  
  // Verificar si el egreso está conciliado
  const { data: isReconciled, error: checkError } = await supabase.rpc("is_egress_reconciled", {
    in_egress_id: egressId,
  });
  
  if (checkError) {
    console.error("Error verificando si egreso está conciliado", checkError);
    return { error: "No se pudo verificar el estado del egreso." };
  }
  
  if (isReconciled) {
    return { error: "No se puede anular un egreso que está conciliado. Debes borrar la conciliación primero." };
  }
  
  const motivo = (reason || "").trim() || "Anulado";
  const { error } = await supabase
    .from("egresses")
    .update({ status: "anulado", cancellation_reason: motivo, cancelled_at: new Date().toISOString() })
    .eq("id", egressId)
    .eq("condominium_id", condominiumId);
  if (error) {
    console.error("Error anulando egreso", error);
    return { error: "No se pudo anular el egreso." };
  }
  revalidatePath(`/app/${condominiumId}/egresses`);
  revalidatePath(`/app/${condominiumId}/egresses/${egressId}`);
  return { success: true };
}

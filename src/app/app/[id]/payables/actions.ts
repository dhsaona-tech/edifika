"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  EgressPaymentInput,
  PayableFilters,
  PayableGeneralInput,
  egressPaymentSchema,
  payableFiltersSchema,
  payableGeneralSchema,
} from "@/lib/payables/schemas";

// Sanitizar búsquedas para prevenir SQL injection en PostgREST
function sanitizeSearch(input: string | undefined | null): string {
  if (!input) return "";
  return input.replace(/[%_*(),.\\'";\n\r\t]/g, "").trim().slice(0, 100);
}

type PayableRow = {
  id: string;
  supplier_id: string;
  expense_item_id: string;
  issue_date: string;
  due_date: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  balance: number | null;
  status: string;
  description?: string | null;
  notes?: string | null;
  invoice_file_url?: string | null;
  op_pdf_url?: string | null;
  folio_op?: number | null;
  supplier?: { name?: string | null } | null;
  expense_item?: { name?: string | null } | null;
};

const bucketUsed = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_ATTACHMENTS || "pdfs";
const normalizeEgressPdfUrl = (url?: string | null) => (url && url.includes(`/${bucketUsed}/`) ? url : null);

const normalizeReason = (text: string) => (text || "").trim() || "Anulado por administrador";

export async function listPayables(condominiumId: string, filters?: PayableFilters) {
  const parsedFilters = payableFiltersSchema.safeParse(filters || {});
  const supabase = await createClient();

  let query = supabase
    .from("payable_orders")
    .select("*")
    .eq("condominium_id", condominiumId)
    .order("issue_date", { ascending: false });

  if (!parsedFilters.success) {
    query = query.neq("status", "pagado");
  } else {
    const f = parsedFilters.data;
    if (f.status) query = query.eq("status", f.status);
    else query = query.neq("status", "pagado");
    if (f.supplierId) query = query.eq("supplier_id", f.supplierId);
    if (f.expenseItemId) query = query.eq("expense_item_id", f.expenseItemId);
    if (f.from) query = query.gte("issue_date", f.from);
    if (f.to) query = query.lte("issue_date", f.to);
    if (f.search) {
      const safeSearch = sanitizeSearch(f.search);
      if (safeSearch) {
        query = query.or(
          [
            `invoice_number.ilike.%${safeSearch}%`,
            `description.ilike.%${safeSearch}%`,
            `notes.ilike.%${safeSearch}%`,
          ].join(",")
        );
      }
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error listando payable_orders", error);
    return [];
  }
  const payables = data || [];

  const supplierIds = payables.map((p) => p.supplier_id).filter(Boolean) as string[];
  const expenseIds = payables.map((p) => p.expense_item_id).filter(Boolean) as string[];

  const [suppliersRes, expensesRes] = await Promise.all([
    supplierIds.length
      ? supabase.from("suppliers").select("id, name").in("id", supplierIds)
      : Promise.resolve({ data: [] as any[] }),
    expenseIds.length
      ? supabase.from("expense_items").select("id, name").in("id", expenseIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const supplierMap = new Map<string, any>();
  const expenseMap = new Map<string, any>();
  (suppliersRes.data || []).forEach((s) => supplierMap.set(s.id, s));
  (expensesRes.data || []).forEach((e) => expenseMap.set(e.id, e));

  return payables.map((p) => ({
    ...p,
    supplier: supplierMap.get(p.supplier_id) || null,
    expense_item: expenseMap.get(p.expense_item_id) || null,
  })) as PayableRow[];
}

export async function getPayableDetail(condominiumId: string, payableId: string) {
  const supabase = await createClient();
  const { data: payable, error } = await supabase
    .from("payable_orders")
    .select("*")
    .eq("id", payableId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();
  if (error || !payable) {
    console.error("Error leyendo payable_order", error);
    return null;
  }

  const [supplierRes, expenseRes, allocationsRes] = await Promise.all([
    supabase.from("suppliers").select("id, name, fiscal_id, contact_person, phone, email").eq("id", payable.supplier_id).maybeSingle(),
    supabase.from("expense_items").select("id, name").eq("id", payable.expense_item_id).maybeSingle(),
    supabase
      .from("egress_allocations")
      .select(
        `
        id,
        amount_allocated,
        egress:egresses(
          id,
          payment_date,
          payment_method,
          reference_number,
          total_amount,
          folio_eg,
          pdf_url,
          status
        )
      `
      )
      .eq("payable_order_id", payableId),
  ]);

  const allocations =
    (allocationsRes.data || []).map((a: any) => ({
      ...a,
      egress: a.egress ? { ...a.egress, pdf_url: normalizeEgressPdfUrl(a.egress.pdf_url) } : null,
    })) || [];

  return {
    ...payable,
    supplier: supplierRes.data || null,
    expense_item: expenseRes.data || null,
    allocations,
  };
}

export async function getSuppliersBasic(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, default_expense_item_id, is_active")
    .eq("condominium_id", condominiumId)
    .eq("is_active", true)
    .order("name");
  if (error) return [];
  return data || [];
}

export async function getExpenseItemsGasto(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_items")
    .select("id, name")
    .eq("condominium_id", condominiumId)
    .eq("category", "gasto")
    .eq("is_active", true)
    .order("name");
  if (error) return [];
  return data || [];
}

export async function getFinancialAccounts(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_accounts")
    .select("id, bank_name, account_number, is_active")
    .eq("condominium_id", condominiumId)
    .eq("is_active", true)
    .order("bank_name");
  if (error) return [];
  return data || [];
}

export async function createPayable(condominiumId: string, payload: PayableGeneralInput) {
  const parsed = payableGeneralSchema.parse({ ...payload, condominium_id: condominiumId });

  const supabase = await createClient();

  // Evitar factura duplicada por proveedor
  const { data: dup } = await supabase
    .from("payable_orders")
    .select("id")
    .eq("condominium_id", condominiumId)
    .eq("supplier_id", parsed.supplier_id)
    .eq("invoice_number", parsed.invoice_number)
    .limit(1)
    .maybeSingle();
  if (dup) return { error: "Ya existe una OP con ese numero de factura para este proveedor." };

  const { data, error } = await supabase
    .from("payable_orders")
    .insert({
      condominium_id: condominiumId,
      supplier_id: parsed.supplier_id,
      expense_item_id: parsed.expense_item_id,
      issue_date: parsed.issue_date,
      due_date: parsed.due_date,
      total_amount: parsed.total_amount,
      paid_amount: 0,
      status: "pendiente_aprobacion",
      invoice_number: parsed.invoice_number,
      description: parsed.description || null,
      notes:
        parsed.planned_payment_method
          ? `Pago previsto: ${parsed.planned_payment_method || "sin definir"}${parsed.notes ? ` | ${parsed.notes}` : ""}`
          : parsed.notes || null,
      invoice_file_url: null,
      folio_op: null,
    })
    .select("id")
    .maybeSingle();

  if (error || !data?.id) {
    console.error("Error creando payable_order", error);
    return { error: "No se pudo crear la OP." };
  }

  revalidatePath(`/app/${condominiumId}/payables`);
  return { success: true, payableId: data.id };
}

export async function updatePayable(condominiumId: string, payableId: string, payload: PayableGeneralInput) {
  const parsed = payableGeneralSchema.parse({ ...payload, condominium_id: condominiumId });
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("payable_orders")
    .select("id, paid_amount, status")
    .eq("id", payableId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();
  if (existingError || !existing) return { error: "OP no encontrada." };
  if (Number(existing.paid_amount || 0) > 0) return { error: "No puedes editar una OP que ya tiene pagos." };
  if (["anulado", "pagado"].includes((existing.status || "").toLowerCase()))
    return { error: "No puedes editar una OP pagada o anulada." };

  const { data: dup } = await supabase
    .from("payable_orders")
    .select("id")
    .eq("condominium_id", condominiumId)
    .eq("supplier_id", parsed.supplier_id)
    .eq("invoice_number", parsed.invoice_number)
    .neq("id", payableId)
    .limit(1)
    .maybeSingle();
  if (dup) return { error: "Ya existe una OP con ese numero de factura para este proveedor." };

  const { error } = await supabase
    .from("payable_orders")
    .update({
      supplier_id: parsed.supplier_id,
      expense_item_id: parsed.expense_item_id,
      issue_date: parsed.issue_date,
      due_date: parsed.due_date,
      total_amount: parsed.total_amount,
      invoice_number: parsed.invoice_number,
      description: parsed.description || null,
      notes:
        parsed.planned_payment_method
          ? `Pago previsto: ${parsed.planned_payment_method || "sin definir"}${parsed.notes ? ` | ${parsed.notes}` : ""}`
          : parsed.notes || null,
      status: "pendiente_aprobacion",
    })
    .eq("id", payableId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("Error actualizando payable_order", error);
    return { error: "No se pudo actualizar la OP." };
  }

  revalidatePath(`/app/${condominiumId}/payables`);
  revalidatePath(`/app/${condominiumId}/payables/${payableId}`);
  return { success: true };
}

export async function cancelPayable(condominiumId: string, payableId: string, reason: string) {
  const supabase = await createClient();
  const motivo = normalizeReason(reason);
  const { error } = await supabase
    .from("payable_orders")
    .update({ status: "anulado", cancellation_reason: motivo, cancelled_at: new Date().toISOString() })
    .eq("id", payableId)
    .eq("condominium_id", condominiumId);
  if (error) {
    console.error("Error anulando payable_order", error);
    return { error: "No se pudo anular la OP." };
  }
  revalidatePath(`/app/${condominiumId}/payables`);
  revalidatePath(`/app/${condominiumId}/payables/${payableId}`);
  return { success: true };
}

export async function approvePayable(condominiumId: string, payableId: string) {
  const supabase = await createClient();
  
  const { data: existing, error: existingError } = await supabase
    .from("payable_orders")
    .select("id, status")
    .eq("id", payableId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();
    
  if (existingError || !existing) {
    return { error: "OP no encontrada." };
  }
  
  if (existing.status === "aprobada") {
    return { error: "La OP ya está aprobada." };
  }
  
  if (["pagada", "parcialmente_pagado"].includes(existing.status)) {
    return { error: "No puedes aprobar una OP que ya tiene pagos." };
  }
  
  if (existing.status === "anulado") {
    return { error: "No puedes aprobar una OP anulada." };
  }
  
  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  
  // Llamar función SQL que aprueba y asigna folio
  const { data, error } = await supabase.rpc('approve_payable_order', {
    p_payable_id: payableId,
    p_approved_by_profile_id: user?.id || null
  });
  
  if (error) {
    console.error("Error aprobando OP", error);
    return { error: error.message || "No se pudo aprobar la OP." };
  }
  
  revalidatePath(`/app/${condominiumId}/payables`);
  revalidatePath(`/app/${condominiumId}/payables/${payableId}`);
  
  return { success: true };
}

export async function createEgressForPayables(condominiumId: string, payload: EgressPaymentInput) {
  const parsed = egressPaymentSchema.parse(payload);
  const supabase = await createClient();

  // Cargar OP seleccionadas para validar saldos y proveedor
  const payableIds = parsed.payables.map((p) => p.payable_order_id);
  const { data: payables, error: payablesError } = await supabase
    .from("payable_orders")
    .select("*")
    .in("id", payableIds)
    .eq("condominium_id", condominiumId);
  if (payablesError) {
    console.error("Error leyendo OP para pago", payablesError);
    return { error: "No se pudieron validar las OP." };
  }
  if (!payables || payables.length !== payableIds.length) return { error: "Alguna OP no existe." };

  const supplierMismatch = payables.find((p) => p.supplier_id !== parsed.supplier_id);
  if (supplierMismatch) return { error: "Todas las OP deben ser del mismo proveedor." };

  const invalidStatus = payables.find((p) => 
    ["anulado", "pagado", "pendiente_aprobacion"].includes((p.status || "").toLowerCase())
  );
  if (invalidStatus) return { error: "Solo puedes pagar OP aprobadas. Verifica que todas las OP estén aprobadas." };

  const payablesMap = new Map<string, any>();
  payables.forEach((p) => payablesMap.set(p.id, p));

  const total = parsed.payables.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  if (total <= 0) return { error: "El monto total debe ser mayor a 0." };

  for (const item of parsed.payables) {
    const op = payablesMap.get(item.payable_order_id);
    const saldo = Number(op?.balance ?? op?.total_amount ?? 0) - Number(op?.paid_amount || 0);
    if (item.amount > saldo + 0.001) {
      return { error: "No puedes pagar mas que el saldo de la OP." };
    }
  }

  // ✅ ELIMINADO: reserve_folio_eg
  // El trigger assign_folio_eg() lo hace automáticamente

  const { data: egress, error: egressError } = await supabase
    .from("egresses")
    .insert({
      condominium_id: condominiumId,
      supplier_id: parsed.supplier_id,
      financial_account_id: parsed.financial_account_id,
      payment_date: parsed.payment_date,
      total_amount: total,
      total_allocated_amount: total,
      payment_method: parsed.payment_method,
      reference_number: parsed.reference_number || null,
      notes: parsed.notes || null,
      expense_item_id: payables[0]?.expense_item_id || null,
      // ✅ NO enviar folio_eg (el trigger lo asigna automáticamente)
      status: "disponible",
    })
    .select("id")
    .maybeSingle();

  if (egressError || !egress?.id) {
    console.error("Error creando egreso", egressError);
    return { error: "No se pudo crear el egreso." };
  }

  const allocationsPayload = parsed.payables.map((p) => ({
    egress_id: egress.id,
    payable_order_id: p.payable_order_id,
    amount_allocated: p.amount,
  }));

  const { error: allocError } = await supabase.from("egress_allocations").insert(allocationsPayload);
  if (allocError) {
    console.error("Error creando allocations egreso", allocError);
    return { error: "No se pudieron vincular las OP al egreso." };
  }

  for (const item of parsed.payables) {
    const op = payablesMap.get(item.payable_order_id);
    const newPaid = Number(op.paid_amount || 0) + Number(item.amount);
    const status =
      newPaid >= Number(op.total_amount || 0) - 0.009
        ? "pagado"
        : newPaid > 0.009
          ? "parcialmente_pagado"
          : op.status || "pendiente_aprobacion";
    const { error: updateError } = await supabase
      .from("payable_orders")
      .update({
        paid_amount: newPaid,
        status,
      })
      .eq("id", item.payable_order_id)
      .eq("condominium_id", condominiumId);
    if (updateError) {
      console.error("Error actualizando OP despues de pagar", updateError);
    }
  }

  revalidatePath(`/app/${condominiumId}/payables`);
  return { success: true, egressId: egress.id, total };
}
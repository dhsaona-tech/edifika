"use server";

import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ANULACION"
  | "CONCILIACION"
  | "APROBACION"
  | "TRANSFERENCIA"
  | "AJUSTE";

export type AuditTableName =
  | "payments"
  | "egresses"
  | "charges"
  | "charge_batches"
  | "payable_orders"
  | "reconciliations"
  | "payment_agreements"
  | "budgets_master"
  | "financial_accounts"
  | "extraordinary_plans"
  | "unidentified_payments"
  | "petty_cash_vouchers"
  | "petty_cash_periods";

interface LogAuditParams {
  condominiumId: string;
  tableName: AuditTableName;
  recordId: string;
  action: AuditAction;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  performedBy?: string | null;
  notes?: string | null;
}

/**
 * Registra una acción en el log de auditoría.
 * Fire-and-forget: nunca bloquea ni lanza error al caller.
 * Si performedBy no se provee, intenta obtenerlo de auth.uid().
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const supabase = await createClient();

    let performedBy = params.performedBy;
    if (!performedBy) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      performedBy = user?.id ?? null;
    }

    await supabase.from("audit_logs").insert({
      condominium_id: params.condominiumId,
      table_name: params.tableName,
      record_id: params.recordId,
      action: params.action,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
      performed_by: performedBy,
      notes: params.notes ?? null,
    });
  } catch (err) {
    // Fire-and-forget: log pero no bloquear la operación principal
    console.warn("[AUDIT] Error registrando log de auditoría:", err);
  }
}

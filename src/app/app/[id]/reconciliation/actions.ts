"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getUser";
import { logAudit } from "@/lib/audit/logAudit";
import { revalidatePath } from "next/cache";
import { isEffectivelyZero } from "@/lib/utils/money";
import {
  ReconciliationInput,
  ReconciliationItemsInput,
  reconciliationSchema,
  reconciliationItemsSchema,
} from "@/lib/reconciliation/schemas";
import type {
  ReconciliationPayment,
  ReconciliationEgress,
} from "@/types/reconciliation";

/**
 * Obtener todos los ingresos (payments) de una cuenta hasta la fecha de corte.
 * Excluye los que ya están en conciliaciones finalizadas AJENAS.
 * Si se pasa `currentReconciliationId`, los pagos de ESA conciliación NO se excluyen
 * (necesario para ver/editar una conciliación existente).
 */
export async function getPaymentsForReconciliation(
  condominiumId: string,
  accountId: string,
  cutoffDate: string,
  currentReconciliationId?: string
): Promise<ReconciliationPayment[]> {
  try {
    const supabase = await createClient();

    // Obtener la última conciliación finalizada para saber desde dónde empezar.
    // Si estamos viendo/editando una conciliación existente (currentReconciliationId),
    // la excluimos para que no retorne ESA MISMA como "la última", lo que crearía
    // un rango de fechas imposible (periodStart > cutoffDate).
    let periodStart = "2000-01-01";
    try {
      const lastReconciliation = await getLastReconciliation(condominiumId, accountId, currentReconciliationId);
      if (lastReconciliation?.cutoff_date) {
        const lastDate = new Date(lastReconciliation.cutoff_date);
        lastDate.setDate(lastDate.getDate() + 1);
        periodStart = lastDate.toISOString().split("T")[0];
      }
    } catch {
      // Si falla, usar fecha por defecto
    }

    // Obtener pagos no cancelados hasta la fecha de corte
    let query = supabase
      .from("payments")
      .select("id, folio_rec, payment_date, total_amount, payment_method, reference_number, unit_id, payer_profile_id, financial_account_id")
      .eq("condominium_id", condominiumId)
      .eq("financial_account_id", accountId)
      .neq("status", "cancelado")
      .lte("payment_date", cutoffDate);

    if (periodStart !== "2000-01-01") {
      query = query.gte("payment_date", periodStart);
    }

    const { data: paymentsData, error } = await query
      .order("payment_date", { ascending: true })
      .order("folio_rec", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error obteniendo pagos para conciliación:", error.message);
      return [];
    }

    if (!paymentsData || paymentsData.length === 0) {
      return [];
    }

    // Enriquecer con datos de unidades y pagadores
    const unitIds = paymentsData.map((p: any) => p.unit_id).filter(Boolean) as string[];
    const payerIds = paymentsData.map((p: any) => p.payer_profile_id).filter(Boolean) as string[];

    const [unitsRes, payersRes] = await Promise.all([
      unitIds.length > 0
        ? supabase.from("units").select("id, full_identifier, identifier").in("id", unitIds)
        : Promise.resolve({ data: [] as any[] }),
      payerIds.length > 0
        ? supabase.from("profiles").select("id, full_name").in("id", payerIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const unitsMap = new Map((unitsRes.data || []).map((u: any) => [u.id, u]));
    const payersMap = new Map((payersRes.data || []).map((p: any) => [p.id, p]));

    const data = paymentsData.map((payment: any) => ({
      ...payment,
      unit: payment.unit_id ? unitsMap.get(payment.unit_id) || null : null,
      payer: payment.payer_profile_id ? payersMap.get(payment.payer_profile_id) || null : null,
    }));

    // Excluir pagos en conciliaciones finalizadas ajenas
    const paymentIds = data.map((p: any) => p.id);

    const { data: reconciledRecons } = await supabase
      .from("reconciliations")
      .select("id")
      .eq("condominium_id", condominiumId)
      .eq("financial_account_id", accountId)
      .eq("status", "conciliada");

    if (reconciledRecons && reconciledRecons.length > 0) {
      // Excluir la conciliación actual del filtro (si se está editando)
      const reconIdsToExclude = reconciledRecons
        .map((r: any) => r.id)
        .filter((id: string) => id !== currentReconciliationId);

      if (reconIdsToExclude.length > 0 && paymentIds.length > 0) {
        const { data: reconciledPayments } = await supabase
          .from("reconciliation_items")
          .select("payment_id")
          .in("payment_id", paymentIds)
          .in("reconciliation_id", reconIdsToExclude)
          .not("payment_id", "is", null);

        const reconciledPaymentIds = new Set(
          (reconciledPayments || []).map((rp: any) => rp.payment_id)
        );

        return data.filter((p: any) => !reconciledPaymentIds.has(p.id)) as ReconciliationPayment[];
      }
    }

    return data as ReconciliationPayment[];
  } catch (err) {
    console.error("Error general en getPaymentsForReconciliation:", err);
    return [];
  }
}

/**
 * Obtener todos los egresos de una cuenta hasta la fecha de corte.
 * Excluye los que ya están en conciliaciones finalizadas AJENAS.
 * Si se pasa `currentReconciliationId`, los egresos de ESA conciliación NO se excluyen.
 */
export async function getEgressesForReconciliation(
  condominiumId: string,
  accountId: string,
  cutoffDate: string,
  currentReconciliationId?: string
): Promise<ReconciliationEgress[]> {
  try {
    const supabase = await createClient();

    // Obtener la última conciliación finalizada para saber desde dónde empezar.
    // Excluir currentReconciliationId para evitar rango de fechas imposible.
    let periodStart = "2000-01-01";
    try {
      const lastReconciliation = await getLastReconciliation(condominiumId, accountId, currentReconciliationId);
      if (lastReconciliation?.cutoff_date) {
        const lastDate = new Date(lastReconciliation.cutoff_date);
        lastDate.setDate(lastDate.getDate() + 1);
        periodStart = lastDate.toISOString().split("T")[0];
      }
    } catch {
      // Si falla, usar fecha por defecto
    }

    // Obtener egresos no cancelados hasta la fecha de corte
    let egressQuery = supabase
      .from("egresses")
      .select(`
        id,
        folio_eg,
        payment_date,
        total_amount,
        payment_method,
        reference_number,
        supplier:suppliers(name),
        financial_account:financial_accounts(bank_name, account_number)
      `)
      .eq("condominium_id", condominiumId)
      .eq("financial_account_id", accountId)
      .neq("status", "cancelado")
      .lte("payment_date", cutoffDate);

    if (periodStart !== "2000-01-01") {
      egressQuery = egressQuery.gte("payment_date", periodStart);
    }

    const { data: egresses, error } = await egressQuery
      .order("payment_date", { ascending: true })
      .order("folio_eg", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error obteniendo egresos para conciliación:", error.message);
      return [];
    }

    if (!egresses || egresses.length === 0) {
      return [];
    }

    // Excluir egresos en conciliaciones finalizadas ajenas
    let availableEgresses = egresses;
    const egressIds = egresses.map((e: any) => e.id);

    const { data: reconciledRecons } = await supabase
      .from("reconciliations")
      .select("id")
      .eq("condominium_id", condominiumId)
      .eq("financial_account_id", accountId)
      .eq("status", "conciliada");

    if (reconciledRecons && reconciledRecons.length > 0) {
      // Excluir la conciliación actual del filtro
      const reconIdsToExclude = reconciledRecons
        .map((r: any) => r.id)
        .filter((id: string) => id !== currentReconciliationId);

      if (reconIdsToExclude.length > 0 && egressIds.length > 0) {
        const { data: reconciledEgresses } = await supabase
          .from("reconciliation_items")
          .select("egress_id")
          .in("egress_id", egressIds)
          .in("reconciliation_id", reconIdsToExclude)
          .not("egress_id", "is", null);

        const reconciledEgressIds = new Set(
          (reconciledEgresses || []).map((re: any) => re.egress_id)
        );

        availableEgresses = egresses.filter((e: any) => !reconciledEgressIds.has(e.id));
      }
    }

    if (availableEgresses.length === 0) {
      return [];
    }

    // Obtener cheques para estos egresos
    const availableEgressIds = availableEgresses.map((e: any) => e.id);
    const { data: checks } = await supabase
      .from("checks")
      .select("id, check_number, status, egress_id")
      .in("egress_id", availableEgressIds);

    const checksMap = new Map();
    (checks || []).forEach((check: any) => {
      if (check.egress_id) {
        checksMap.set(check.egress_id, {
          id: check.id,
          check_number: check.check_number,
          status: check.status,
        });
      }
    });

    return availableEgresses.map((egress: any) => ({
      ...egress,
      check: checksMap.get(egress.id) || null,
    })) as ReconciliationEgress[];
  } catch (err) {
    console.error("Error general en getEgressesForReconciliation:", err);
    return [];
  }
}

/**
 * Obtener la última conciliación finalizada de una cuenta.
 * Si se pasa `excludeId`, excluye esa conciliación del resultado
 * (necesario para no retornar la MISMA conciliación cuando se está viendo/editando).
 */
export async function getLastReconciliation(
  condominiumId: string,
  accountId: string,
  excludeId?: string
) {
  const supabase = await createClient();
  let query = supabase
    .from("reconciliations")
    .select("id, cutoff_date, closing_balance_calculated")
    .eq("condominium_id", condominiumId)
    .eq("financial_account_id", accountId)
    .eq("status", "conciliada")
    .order("cutoff_date", { ascending: false })
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Error obteniendo última conciliación:", error.message);
    return null;
  }

  return data;
}

/**
 * Obtener el saldo inicial de una cuenta al inicio del período.
 * Usa el mismo filtro de status que getPayments/getEgresses: excluye solo cancelados.
 */
export async function getAccountInitialBalance(
  accountId: string,
  periodStart: string
): Promise<number> {
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("financial_accounts")
    .select("initial_balance")
    .eq("id", accountId)
    .maybeSingle();

  if (!account) return 0;

  // Usar neq("status", "cancelado") para consistencia con getPayments/getEgresses
  const [paymentsRes, egressesRes] = await Promise.all([
    supabase
      .from("payments")
      .select("total_amount")
      .eq("financial_account_id", accountId)
      .neq("status", "cancelado")
      .lt("payment_date", periodStart),
    supabase
      .from("egresses")
      .select("total_amount")
      .eq("financial_account_id", accountId)
      .neq("status", "cancelado")
      .lt("payment_date", periodStart),
  ]);

  const paymentsSum = (paymentsRes.data || []).reduce(
    (sum, p) => sum + Number(p.total_amount || 0),
    0
  );
  const egressesSum = (egressesRes.data || []).reduce(
    (sum, e) => sum + Number(e.total_amount || 0),
    0
  );

  return Number(account.initial_balance || 0) + paymentsSum - egressesSum;
}

/**
 * Listar todas las conciliaciones de un condominio.
 */
export async function listReconciliations(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reconciliations")
    .select(`
      id,
      cutoff_date,
      period_start,
      period_end,
      opening_balance,
      closing_balance_bank,
      closing_balance_calculated,
      difference,
      status,
      reconciled_at,
      notes,
      financial_account:financial_accounts(bank_name, account_number)
    `)
    .eq("condominium_id", condominiumId)
    .order("cutoff_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error listando conciliaciones:", error.message);
    return [];
  }

  return data || [];
}

/**
 * Obtener una conciliación por ID.
 */
export async function getReconciliation(
  condominiumId: string,
  reconciliationId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reconciliations")
    .select(`
      *,
      financial_account:financial_accounts(bank_name, account_number)
    `)
    .eq("id", reconciliationId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo conciliación:", error.message);
    return null;
  }

  return data;
}

/**
 * Verificar si hay conciliaciones pendientes (borradores) anteriores a una fecha.
 * REGLA 10.5: Continuidad de meses.
 */
export async function checkPendingReconciliations(
  condominiumId: string,
  accountId: string,
  cutoffDate: string
): Promise<{ hasPending: boolean; pendingDate?: string }> {
  const supabase = await createClient();

  const { data: pendingRecons } = await supabase
    .from("reconciliations")
    .select("cutoff_date")
    .eq("condominium_id", condominiumId)
    .eq("financial_account_id", accountId)
    .eq("status", "borrador")
    .lt("cutoff_date", cutoffDate)
    .order("cutoff_date", { ascending: false })
    .limit(1);

  if (pendingRecons && pendingRecons.length > 0) {
    return { hasPending: true, pendingDate: pendingRecons[0].cutoff_date };
  }

  return { hasPending: false };
}

/**
 * Crear una nueva conciliación.
 */
export async function createReconciliation(
  condominiumId: string,
  input: ReconciliationInput
) {
  const parsed = reconciliationSchema.parse(input);
  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado" };

  const supabase = await createClient();

  // REGLA 10.5: No crear si hay borradores anteriores pendientes
  const { hasPending, pendingDate } = await checkPendingReconciliations(
    condominiumId,
    parsed.financial_account_id,
    parsed.cutoff_date
  );

  if (hasPending) {
    return {
      error: `No se puede crear esta conciliación. Existe una conciliación pendiente (borrador) con fecha ${pendingDate}. Debe finalizarla o eliminarla primero.`
    };
  }

  // Calcular period_start y opening_balance
  const lastReconciliation = await getLastReconciliation(
    condominiumId,
    parsed.financial_account_id
  );

  let periodStart: string;
  let openingBalance: number;

  if (lastReconciliation?.cutoff_date) {
    const lastDate = new Date(lastReconciliation.cutoff_date);
    lastDate.setDate(lastDate.getDate() + 1);
    periodStart = lastDate.toISOString().split("T")[0];
    openingBalance = Number(lastReconciliation.closing_balance_calculated || 0);
  } else {
    const { data: account } = await supabase
      .from("financial_accounts")
      .select("initial_balance")
      .eq("id", parsed.financial_account_id)
      .maybeSingle();

    if (!account) {
      return { error: "Cuenta bancaria no encontrada" };
    }

    periodStart = "2000-01-01";
    openingBalance = Number(account.initial_balance || 0);
  }

  const { data: reconciliation, error } = await supabase
    .from("reconciliations")
    .insert({
      condominium_id: condominiumId,
      financial_account_id: parsed.financial_account_id,
      cutoff_date: parsed.cutoff_date,
      period_start: periodStart,
      period_end: parsed.cutoff_date,
      opening_balance: openingBalance,
      closing_balance_bank: parsed.closing_balance_bank,
      closing_balance_calculated: openingBalance,
      difference: parsed.closing_balance_bank - openingBalance,
      status: "borrador",
      notes: parsed.notes || null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error creando conciliación:", error.message);

    const errorCode = error?.code || "";
    const errorMessage = String(error?.message || "").toLowerCase();

    // Constraint único: ya existe una conciliación con estos datos
    if (
      errorCode === "23505" ||
      errorMessage.includes("unique") ||
      errorMessage.includes("duplicate")
    ) {
      const { data: existing } = await supabase
        .from("reconciliations")
        .select("id, status")
        .eq("condominium_id", condominiumId)
        .eq("financial_account_id", parsed.financial_account_id)
        .eq("cutoff_date", parsed.cutoff_date)
        .eq("status", "borrador")
        .maybeSingle();

      if (existing) {
        return {
          error: "Ya existe una conciliación en borrador para esta cuenta y fecha. Edita la existente o elimínala.",
          reconciliationId: existing.id,
        };
      }

      return { error: "Ya existe una conciliación finalizada para esta cuenta y fecha de corte." };
    }

    return { error: error?.message || "Error al crear la conciliación" };
  }

  if (!reconciliation) {
    return { error: "No se recibió respuesta al crear la conciliación" };
  }

  // Audit log de creación
  logAudit({
    condominiumId,
    tableName: "reconciliations",
    recordId: reconciliation.id,
    action: "CREATE",
    newValues: {
      cutoff_date: parsed.cutoff_date,
      financial_account_id: parsed.financial_account_id,
      closing_balance_bank: parsed.closing_balance_bank,
      opening_balance: openingBalance,
    },
    performedBy: user.id,
    notes: `Conciliación creada: ${parsed.notes || "Sin detalle"}`,
  });

  revalidatePath(`/app/${condominiumId}/reconciliation`);
  return { success: true, reconciliationId: reconciliation.id };
}

/**
 * Guardar los items seleccionados de la conciliación.
 * Funciona tanto para borradores como para conciliaciones finalizadas
 * (permite editar selección para desbloquear un pago/egreso y corregir errores).
 */
export async function saveReconciliationItems(
  condominiumId: string,
  input: ReconciliationItemsInput
) {
  const parsed = reconciliationItemsSchema.parse(input);
  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado" };

  const supabase = await createClient();

  // Obtener la conciliación completa
  const { data: reconciliation } = await supabase
    .from("reconciliations")
    .select("period_start, financial_account_id, status")
    .eq("id", parsed.reconciliation_id)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!reconciliation) {
    return { error: "Conciliación no encontrada" };
  }

  // Calcular saldo inicial
  const initialBalance = await getAccountInitialBalance(
    reconciliation.financial_account_id,
    reconciliation.period_start
  );

  // Obtener montos de pagos seleccionados
  const { data: payments } = parsed.selected_payments.length > 0
    ? await supabase
        .from("payments")
        .select("id, total_amount, payment_date")
        .in("id", parsed.selected_payments)
    : { data: [] };

  // Obtener montos de egresos seleccionados
  const egressIds = parsed.selected_egresses.map((e) => e.egress_id);
  const { data: egresses } = egressIds.length > 0
    ? await supabase
        .from("egresses")
        .select("id, total_amount, payment_date")
        .in("id", egressIds)
    : { data: [] };

  // Solo contar egresos sin cheque o con cheque cobrado
  const egressIdsToCount = new Set(
    parsed.selected_egresses
      .filter((e) => !e.check_id || e.is_check_cashed)
      .map((e) => e.egress_id)
  );

  const paymentsSum = (payments || []).reduce(
    (sum, p) => sum + Number(p.total_amount || 0),
    0
  );
  const egressesSum = (egresses || [])
    .filter((e) => egressIdsToCount.has(e.id))
    .reduce((sum, e) => sum + Number(e.total_amount || 0), 0);

  const calculatedBalance = initialBalance + paymentsSum - egressesSum;

  // Obtener closing_balance_bank
  const { data: recon } = await supabase
    .from("reconciliations")
    .select("closing_balance_bank")
    .eq("id", parsed.reconciliation_id)
    .maybeSingle();

  const difference = (recon?.closing_balance_bank || 0) - calculatedBalance;

  // Borrar items anteriores
  await supabase
    .from("reconciliation_items")
    .delete()
    .eq("reconciliation_id", parsed.reconciliation_id);

  // Obtener datos completos para snapshot
  const [paymentsFull, egressesFull] = await Promise.all([
    parsed.selected_payments.length > 0
      ? supabase
          .from("payments")
          .select(`id, total_amount, payment_date, folio_rec, reference_number, unit:units(full_identifier)`)
          .in("id", parsed.selected_payments)
      : Promise.resolve({ data: [] as any[] }),
    egressIds.length > 0
      ? supabase
          .from("egresses")
          .select(`id, total_amount, payment_date, folio_eg, reference_number, supplier:suppliers(name)`)
          .in("id", egressIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  // Items de pagos
  const paymentItems = ((paymentsFull as any).data || []).map((payment: any) => ({
    reconciliation_id: parsed.reconciliation_id,
    payment_id: payment.id,
    egress_id: null,
    check_id: null,
    is_check_cashed: false,
    transaction_date: payment.payment_date,
    transaction_type: "ingreso",
    amount: Number(payment.total_amount || 0),
    description: `Recibo #${payment.folio_rec || ""} - ${payment.unit?.full_identifier || ""}`.trim(),
    reference_number: payment.reference_number,
  }));

  // Items de egresos
  const egressItems = parsed.selected_egresses.map((egressItem) => {
    const egress = ((egressesFull as any).data || []).find((e: any) => e.id === egressItem.egress_id);
    const supplier = Array.isArray(egress?.supplier) ? egress.supplier[0] : egress?.supplier;
    return {
      reconciliation_id: parsed.reconciliation_id,
      payment_id: null,
      egress_id: egressItem.egress_id,
      check_id: egressItem.check_id,
      is_check_cashed: egressItem.is_check_cashed,
      transaction_date: egress?.payment_date || "",
      transaction_type: "egreso",
      amount: Number(egress?.total_amount || 0),
      description: `Egreso #${egress?.folio_eg || ""} - ${supplier?.name || ""}`.trim(),
      reference_number: egress?.reference_number || (egressItem.check_id ? `Cheque #${egressItem.check_id}` : null),
    };
  });

  // Insertar todos los items
  const allItems = [...paymentItems, ...egressItems];
  if (allItems.length > 0) {
    const { error: itemsError } = await supabase
      .from("reconciliation_items")
      .insert(allItems);

    if (itemsError) {
      console.error("Error guardando items de conciliación:", itemsError.message);
      return { error: "No se pudieron guardar los items" };
    }
  }

  // Actualizar la conciliación con los cálculos
  // Si estaba conciliada y ahora la diferencia cambió, volver a borrador
  const newStatus = reconciliation.status === "conciliada" && !isEffectivelyZero(difference)
    ? "borrador"
    : reconciliation.status;

  const updateData: Record<string, any> = {
    closing_balance_calculated: calculatedBalance,
    difference: difference,
    updated_at: new Date().toISOString(),
  };

  // Si el status cambió de conciliada a borrador, actualizar status
  if (newStatus !== reconciliation.status) {
    updateData.status = newStatus;
    updateData.reconciled_at = null;
    updateData.reconciled_by = null;
  }

  const { error: updateError } = await supabase
    .from("reconciliations")
    .update(updateData)
    .eq("id", parsed.reconciliation_id);

  if (updateError) {
    console.error("Error actualizando conciliación:", updateError.message);
    return { error: "No se pudo actualizar la conciliación" };
  }

  // Log de auditoría si se modificó una conciliación finalizada
  if (reconciliation.status === "conciliada") {
    logAudit({
      condominiumId,
      tableName: "reconciliations",
      recordId: parsed.reconciliation_id,
      action: "UPDATE",
      oldValues: { status: reconciliation.status },
      newValues: { status: newStatus, difference, calculatedBalance },
      performedBy: user.id,
      notes: newStatus === "borrador"
        ? "Conciliación reabierta a borrador por cambio de items (diferencia ≠ $0.00)"
        : "Items de conciliación modificados (diferencia sigue en $0.00)",
    });
  }

  revalidatePath(`/app/${condominiumId}/reconciliation`);
  return { success: true, calculatedBalance, difference, status: newStatus };
}

/**
 * Actualizar el saldo real del banco en una conciliación existente.
 */
export async function updateReconciliationBankBalance(
  condominiumId: string,
  reconciliationId: string,
  closingBalanceBank: number,
  notes?: string
) {
  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado" };

  const supabase = await createClient();

  const { data: recon } = await supabase
    .from("reconciliations")
    .select("closing_balance_calculated, closing_balance_bank, status")
    .eq("id", reconciliationId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!recon) {
    return { error: "Conciliación no encontrada" };
  }

  const difference = closingBalanceBank - (recon.closing_balance_calculated || 0);

  const updateData: Record<string, any> = {
    closing_balance_bank: closingBalanceBank,
    difference,
    updated_at: new Date().toISOString(),
  };

  if (notes !== undefined) {
    updateData.notes = notes;
  }

  // Si estaba conciliada y ahora hay diferencia, volver a borrador
  if (recon.status === "conciliada" && !isEffectivelyZero(difference)) {
    updateData.status = "borrador";
    updateData.reconciled_at = null;
    updateData.reconciled_by = null;
  }

  const { error } = await supabase
    .from("reconciliations")
    .update(updateData)
    .eq("id", reconciliationId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("Error actualizando saldo banco:", error.message);
    return { error: "No se pudo actualizar el saldo" };
  }

  revalidatePath(`/app/${condominiumId}/reconciliation`);
  return { success: true, difference };
}

/**
 * Finalizar conciliación (marcar como conciliada).
 * REGLA 10.3: Solo si diferencia = $0.00.
 */
export async function finalizeReconciliation(
  condominiumId: string,
  reconciliationId: string
) {
  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado" };

  const supabase = await createClient();

  // Verificar que existe y está en borrador
  const { data: reconciliation, error: checkError } = await supabase
    .from("reconciliations")
    .select("status, difference")
    .eq("id", reconciliationId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (checkError) {
    console.error("Error verificando conciliación:", checkError.message);
    return { error: "No se pudo verificar la conciliación" };
  }

  if (!reconciliation) {
    return { error: "Conciliación no encontrada" };
  }

  if (reconciliation.status !== "borrador") {
    return { error: `La conciliación ya está ${reconciliation.status === "conciliada" ? "conciliada" : "cerrada"}` };
  }

  // REGLA 10.3: Diferencia debe ser $0.00
  if (!isEffectivelyZero(reconciliation.difference || 0)) {
    return {
      error: `No se puede finalizar. La diferencia debe ser $0.00 (actualmente: $${Math.abs(reconciliation.difference || 0).toFixed(2)})`
    };
  }

  // Verificar que haya al menos un item
  const { count } = await supabase
    .from("reconciliation_items")
    .select("id", { count: "exact", head: true })
    .eq("reconciliation_id", reconciliationId);

  if (!count || count === 0) {
    return { error: "No se puede finalizar una conciliación sin items seleccionados" };
  }

  // Obtener o crear perfil del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return { error: "No se encontró el perfil del usuario. Contacta al administrador." };
  }

  const { error } = await supabase
    .from("reconciliations")
    .update({
      status: "conciliada",
      reconciled_at: new Date().toISOString(),
      reconciled_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reconciliationId)
    .eq("condominium_id", condominiumId)
    .eq("status", "borrador");

  if (error) {
    console.error("Error finalizando conciliación:", error.message);
    return { error: error?.message || "No se pudo finalizar la conciliación" };
  }

  logAudit({
    condominiumId,
    tableName: "reconciliations",
    recordId: reconciliationId,
    action: "CONCILIACION",
    newValues: { status: "conciliada", difference: reconciliation.difference },
    performedBy: profile.id,
    notes: "Conciliación finalizada — pagos y egresos del período quedan bloqueados",
  });

  revalidatePath(`/app/${condominiumId}/reconciliation`);
  return { success: true };
}

/**
 * Obtener items de una conciliación.
 */
export async function getReconciliationItems(reconciliationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reconciliation_items")
    .select("*")
    .eq("reconciliation_id", reconciliationId);

  if (error) {
    console.error("Error obteniendo items de conciliación:", error.message);
    return [];
  }

  return data || [];
}

/**
 * Borrar una conciliación.
 * Solo se puede borrar si NO hay conciliaciones posteriores que dependan de ella.
 */
export async function deleteReconciliation(
  condominiumId: string,
  reconciliationId: string
) {
  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado" };

  const supabase = await createClient();

  // Obtener la conciliación a eliminar
  const { data: reconciliation } = await supabase
    .from("reconciliations")
    .select("status, cutoff_date, financial_account_id")
    .eq("id", reconciliationId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!reconciliation) {
    return { error: "Conciliación no encontrada" };
  }

  // Verificar que no hay conciliaciones posteriores para esta cuenta
  const { data: laterRecons } = await supabase
    .from("reconciliations")
    .select("id, cutoff_date, status")
    .eq("condominium_id", condominiumId)
    .eq("financial_account_id", reconciliation.financial_account_id)
    .gt("cutoff_date", reconciliation.cutoff_date)
    .limit(1);

  if (laterRecons && laterRecons.length > 0) {
    const laterDate = laterRecons[0].cutoff_date;
    return {
      error: `No se puede eliminar esta conciliación porque existe una conciliación posterior (${laterDate}). Elimina primero las conciliaciones más recientes.`
    };
  }

  // Audit log ANTES de borrar
  logAudit({
    condominiumId,
    tableName: "reconciliations",
    recordId: reconciliationId,
    action: "DELETE",
    oldValues: { status: reconciliation.status, cutoff_date: reconciliation.cutoff_date },
    performedBy: user.id,
    notes: `Eliminación de conciliación (estado: ${reconciliation.status}, fecha: ${reconciliation.cutoff_date})`,
  });

  // Borrar (items se borran en cascada)
  const { error } = await supabase
    .from("reconciliations")
    .delete()
    .eq("id", reconciliationId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("Error borrando conciliación:", error.message);
    return { error: "No se pudo borrar la conciliación" };
  }

  revalidatePath(`/app/${condominiumId}/reconciliation`);
  return { success: true };
}

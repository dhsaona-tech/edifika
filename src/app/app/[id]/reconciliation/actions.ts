"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getUser";
import { revalidatePath } from "next/cache";
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
 * Obtener todos los ingresos (payments) de una cuenta hasta la fecha de corte
 * Solo los que no están en conciliaciones anteriores
 */
export async function getPaymentsForReconciliation(
  condominiumId: string,
  accountId: string,
  cutoffDate: string
): Promise<ReconciliationPayment[]> {
  try {
    const supabase = await createClient();
    
    // Obtener la última conciliación para saber desde dónde empezar
    let periodStart = "2000-01-01"; // Por defecto, desde el inicio
    try {
      const lastReconciliation = await getLastReconciliation(condominiumId, accountId);
      if (lastReconciliation?.cutoff_date) {
        const lastDate = new Date(lastReconciliation.cutoff_date);
        lastDate.setDate(lastDate.getDate() + 1);
        periodStart = lastDate.toISOString().split("T")[0];
      }
    } catch (err) {
      // Si falla obtener la última conciliación, usar fecha por defecto
      console.warn("No se pudo obtener última conciliación, usando fecha por defecto:", err);
    }

    console.log("Buscando pagos:", {
      condominiumId,
      accountId,
      periodStart,
      cutoffDate,
    });

    // Primero, verificar que hay pagos en la cuenta sin filtrar por fecha ni status
    const { data: allPaymentsCheck, error: checkError } = await supabase
      .from("payments")
      .select("id, payment_date, status, financial_account_id, total_amount")
      .eq("condominium_id", condominiumId)
      .eq("financial_account_id", accountId)
      .limit(10);

    console.log("Pagos en la cuenta (sin filtros):", {
      total: allPaymentsCheck?.length || 0,
      pagos: allPaymentsCheck?.map((p: any) => ({
        fecha: p.payment_date,
        status: p.status,
        monto: p.total_amount,
      })),
      error: checkError,
    });

    // Verificar pagos disponibles (no cancelados)
    const { data: availablePaymentsCheck } = await supabase
      .from("payments")
      .select("id, payment_date, status")
      .eq("condominium_id", condominiumId)
      .eq("financial_account_id", accountId)
      .neq("status", "cancelado")
      .limit(10);

    console.log("Pagos disponibles en la cuenta (no cancelados):", {
      total: availablePaymentsCheck?.length || 0,
      fechas: availablePaymentsCheck?.map((p: any) => ({
        fecha: p.payment_date,
        status: p.status,
      })),
    });

    // Obtener todos los pagos hasta la fecha de corte
    // IMPORTANTE: Mostrar TODOS los pagos hasta la fecha de corte, excluyendo solo los cancelados
    // Si hay conciliaciones anteriores, mostrar solo desde el día siguiente a la última conciliación
    // Primero obtener los datos básicos sin joins para evitar problemas
    let query = supabase
      .from("payments")
      .select("id, folio_rec, payment_date, total_amount, payment_method, reference_number, unit_id, payer_profile_id, financial_account_id")
      .eq("condominium_id", condominiumId)
      .eq("financial_account_id", accountId)
      .neq("status", "cancelado") // Excluir solo los cancelados (incluir "disponible" y otros estados válidos)
      .lte("payment_date", cutoffDate); // Hasta la fecha de corte

    // Solo agregar filtro de fecha inicio si hay una conciliación anterior
    if (periodStart !== "2000-01-01") {
      query = query.gte("payment_date", periodStart);
    }

    const { data: paymentsData, error } = await query
      .order("payment_date", { ascending: true })
      .order("folio_rec", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error obteniendo pagos para conciliación", {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
      });
      return [];
    }

    // Si no hay datos, retornar array vacío directamente
    if (!paymentsData || paymentsData.length === 0) {
      console.log("No se encontraron pagos en la consulta principal");
      return [];
    }

    console.log("Pagos encontrados antes de enriquecer:", paymentsData.length);

    // Enriquecer los datos con información de unidades, pagadores y cuentas
    const unitIds = paymentsData.map((p: any) => p.unit_id).filter(Boolean) as string[];
    const payerIds = paymentsData.map((p: any) => p.payer_profile_id).filter(Boolean) as string[];
    const accountIds = [...new Set(paymentsData.map((p: any) => p.financial_account_id).filter(Boolean))] as string[];

    const [unitsRes, payersRes, accountsRes] = await Promise.all([
      unitIds.length > 0
        ? supabase.from("units").select("id, full_identifier, identifier").in("id", unitIds)
        : Promise.resolve({ data: [] as any[] }),
      payerIds.length > 0
        ? supabase.from("profiles").select("id, full_name").in("id", payerIds)
        : Promise.resolve({ data: [] as any[] }),
      accountIds.length > 0
        ? supabase.from("financial_accounts").select("id, bank_name, account_number").in("id", accountIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const unitsMap = new Map((unitsRes.data || []).map((u: any) => [u.id, u]));
    const payersMap = new Map((payersRes.data || []).map((p: any) => [p.id, p]));
    const accountsMap = new Map((accountsRes.data || []).map((a: any) => [a.id, a]));

    // Combinar datos
    const data = paymentsData.map((payment: any) => ({
      ...payment,
      unit: payment.unit_id ? unitsMap.get(payment.unit_id) || null : null,
      payer: payment.payer_profile_id ? payersMap.get(payment.payer_profile_id) || null : null,
      financial_account: payment.financial_account_id ? accountsMap.get(payment.financial_account_id) || null : null,
    }));

    console.log("Pagos encontrados y enriquecidos:", {
      total: data?.length || 0,
      primeros: data?.slice(0, 3).map((p: any) => ({
        id: p.id,
        fecha: p.payment_date,
        monto: p.total_amount,
      })),
    });

    // Si no hay datos, retornar array vacío directamente
    if (!data || data.length === 0) {
      console.log("No se encontraron pagos después de enriquecer");
      return [];
    }

    console.log("Pagos encontrados antes de filtrar conciliados:", data.length);

    // Excluir pagos que ya están en conciliaciones finalizadas
    try {
      const paymentIds = data.map((p: any) => p.id);
      
      // Obtener IDs de conciliaciones finalizadas de esta cuenta
      const { data: reconciledRecons, error: reconError } = await supabase
        .from("reconciliations")
        .select("id")
        .eq("condominium_id", condominiumId)
        .eq("financial_account_id", accountId)
        .eq("status", "conciliada");

      if (reconError) {
        console.warn("Error obteniendo conciliaciones finalizadas, retornando todos los pagos:", reconError);
        return (data || []) as ReconciliationPayment[];
      }

      if (reconciledRecons && reconciledRecons.length > 0) {
        const reconIds = reconciledRecons.map((r: any) => r.id);
        console.log("Conciliaciones finalizadas encontradas:", reconIds.length);
        
        // Si hay paymentIds, buscar en reconciliation_items
        if (paymentIds.length > 0) {
          const { data: reconciledPayments, error: itemsError } = await supabase
            .from("reconciliation_items")
            .select("payment_id")
            .in("payment_id", paymentIds)
            .in("reconciliation_id", reconIds)
            .not("payment_id", "is", null);

          if (itemsError) {
            console.warn("Error obteniendo items de conciliación, retornando todos los pagos:", itemsError);
            return (data || []) as ReconciliationPayment[];
          }

          const reconciledPaymentIds = new Set(
            (reconciledPayments || []).map((rp: any) => rp.payment_id)
          );

          console.log("Pagos ya conciliados:", reconciledPaymentIds.size);

          const filtered = (data || []).filter((p: any) => !reconciledPaymentIds.has(p.id));
          console.log("Pagos después de filtrar conciliados:", filtered.length, "de", data.length);
          return filtered as ReconciliationPayment[];
        }
      } else {
        console.log("No hay conciliaciones finalizadas, retornando todos los pagos");
      }
    } catch (err) {
      // Si falla el filtrado, retornar todos los datos
      console.warn("Error filtrando pagos conciliados, retornando todos:", err);
    }

    console.log("Retornando todos los pagos sin filtrar:", data.length);
    return (data || []) as ReconciliationPayment[];
  } catch (err) {
    console.error("Error general en getPaymentsForReconciliation:", err);
    return [];
  }
}

/**
 * Obtener todos los egresos de una cuenta hasta la fecha de corte
 * Solo los que no están en conciliaciones anteriores
 */
export async function getEgressesForReconciliation(
  condominiumId: string,
  accountId: string,
  cutoffDate: string
): Promise<ReconciliationEgress[]> {
  try {
    const supabase = await createClient();
    
    // Obtener la última conciliación para saber desde dónde empezar
    let periodStart = "2000-01-01"; // Por defecto, desde el inicio
    try {
      const lastReconciliation = await getLastReconciliation(condominiumId, accountId);
      if (lastReconciliation?.cutoff_date) {
        const lastDate = new Date(lastReconciliation.cutoff_date);
        lastDate.setDate(lastDate.getDate() + 1);
        periodStart = lastDate.toISOString().split("T")[0];
      }
    } catch (err) {
      // Si falla obtener la última conciliación, usar fecha por defecto
      console.warn("No se pudo obtener última conciliación, usando fecha por defecto:", err);
    }

    console.log("Buscando egresos:", {
      condominiumId,
      accountId,
      periodStart,
      cutoffDate,
    });

    // Primero, verificar que hay egresos en la cuenta sin filtrar por fecha ni status
    const { data: allEgressesCheck, error: checkError } = await supabase
      .from("egresses")
      .select("id, payment_date, status, financial_account_id, total_amount")
      .eq("condominium_id", condominiumId)
      .eq("financial_account_id", accountId)
      .limit(10);

    console.log("Egresos en la cuenta (sin filtros):", {
      total: allEgressesCheck?.length || 0,
      egresos: allEgressesCheck?.map((e: any) => ({
        fecha: e.payment_date,
        status: e.status,
        monto: e.total_amount,
      })),
      error: checkError,
    });

    // Verificar egresos disponibles (no cancelados)
    const { data: availableEgressesCheck } = await supabase
      .from("egresses")
      .select("id, payment_date, status")
      .eq("condominium_id", condominiumId)
      .eq("financial_account_id", accountId)
      .neq("status", "cancelado")
      .limit(10);

    console.log("Egresos disponibles en la cuenta (no cancelados):", {
      total: availableEgressesCheck?.length || 0,
      fechas: availableEgressesCheck?.map((e: any) => ({
        fecha: e.payment_date,
        status: e.status,
      })),
    });

    // Obtener todos los egresos hasta la fecha de corte
    // IMPORTANTE: Mostrar TODOS los egresos hasta la fecha de corte, excluyendo solo los cancelados
    // Si hay conciliaciones anteriores, mostrar solo desde el día siguiente a la última conciliación
    let egressQuery = supabase
      .from("egresses")
      .select(
        `
        id,
        folio_eg,
        payment_date,
        total_amount,
        payment_method,
        reference_number,
        supplier:suppliers(name),
        financial_account:financial_accounts(bank_name, account_number)
      `
      )
      .eq("condominium_id", condominiumId)
      .eq("financial_account_id", accountId)
      .neq("status", "cancelado") // Excluir solo los cancelados (incluir "disponible" y otros estados válidos)
      .lte("payment_date", cutoffDate); // Hasta la fecha de corte

    // Solo agregar filtro de fecha inicio si hay una conciliación anterior
    if (periodStart !== "2000-01-01") {
      egressQuery = egressQuery.gte("payment_date", periodStart);
    }

    const { data: egresses, error } = await egressQuery
      .order("payment_date", { ascending: true })
      .order("folio_eg", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error obteniendo egresos para conciliación", {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
      });
      return [];
    }

    console.log("Egresos encontrados:", {
      total: egresses?.length || 0,
      primeros: egresses?.slice(0, 3).map((e: any) => ({
        id: e.id,
        fecha: e.payment_date,
        monto: e.total_amount,
      })),
    });

    if (!egresses || egresses.length === 0) {
      return [];
    }

    // Excluir egresos que ya están en conciliaciones finalizadas
    let availableEgresses = egresses;
    
    try {
      const egressIds = egresses.map((e: any) => e.id);
      
      // Obtener IDs de conciliaciones finalizadas de esta cuenta
      const { data: reconciledRecons } = await supabase
        .from("reconciliations")
        .select("id")
        .eq("condominium_id", condominiumId)
        .eq("financial_account_id", accountId)
        .eq("status", "conciliada");

      if (reconciledRecons && reconciledRecons.length > 0) {
        const reconIds = reconciledRecons.map((r: any) => r.id);
        
        const { data: reconciledEgresses } = await supabase
          .from("reconciliation_items")
          .select("egress_id")
          .in("egress_id", egressIds)
          .in("reconciliation_id", reconIds)
          .not("egress_id", "is", null);

        const reconciledEgressIds = new Set(
          (reconciledEgresses || []).map((re: any) => re.egress_id)
        );

        availableEgresses = egresses.filter((e: any) => !reconciledEgressIds.has(e.id));
        console.log("Egresos después de filtrar conciliados:", availableEgresses.length);
      }
    } catch (err) {
      // Si falla el filtrado, usar todos los egresos
      console.warn("Error filtrando egresos conciliados, retornando todos:", err);
    }

    if (availableEgresses.length === 0) {
      return [];
    }

    // Obtener cheques para estos egresos
    const egressIds = availableEgresses.map((e: any) => e.id);
    const { data: checks } = await supabase
      .from("checks")
      .select("id, check_number, status, egress_id")
      .in("egress_id", egressIds);

    // Crear un mapa de egress_id -> check
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

    // Combinar egresos con sus cheques
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
 * Obtener la última conciliación conciliada de una cuenta
 */
export async function getLastReconciliation(
  condominiumId: string,
  accountId: string
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reconciliations")
      .select("cutoff_date, closing_balance_calculated")
      .eq("condominium_id", condominiumId)
      .eq("financial_account_id", accountId)
      .eq("status", "conciliada") // Solo conciliaciones finalizadas
      .order("cutoff_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // Si la tabla no existe, retornar null silenciosamente
      const errorCode = error?.code || "";
      const errorMessage = String(error?.message || "").toLowerCase();
      
      if (
        errorCode === "PGRST205" ||
        errorCode === "42P01" ||
        errorMessage.includes("could not find the table") ||
        errorMessage.includes("does not exist")
      ) {
        console.log("Tabla reconciliations no existe aún, usando fecha por defecto");
        return null;
      }
      
      console.error("Error obteniendo última conciliación", error);
      return null;
    }

    return data;
  } catch (err) {
    console.warn("Error en getLastReconciliation:", err);
    return null;
  }
}

/**
 * Obtener el saldo inicial de una cuenta al inicio del período
 */
export async function getAccountInitialBalance(
  accountId: string,
  periodStart: string
): Promise<number> {
  const supabase = await createClient();
  
  // Obtener el saldo inicial de la cuenta
  const { data: account } = await supabase
    .from("financial_accounts")
    .select("initial_balance")
    .eq("id", accountId)
    .maybeSingle();

  if (!account) return 0;

  // Calcular el saldo al inicio del período sumando todos los movimientos anteriores
  const { data: paymentsBefore } = await supabase
    .from("payments")
    .select("total_amount")
    .eq("financial_account_id", accountId)
    .eq("status", "disponible")
    .lt("payment_date", periodStart);

  const { data: egressesBefore } = await supabase
    .from("egresses")
    .select("total_amount")
    .eq("financial_account_id", accountId)
    .eq("status", "disponible")
    .lt("payment_date", periodStart);

  const paymentsSum = (paymentsBefore || []).reduce(
    (sum, p) => sum + Number(p.total_amount || 0),
    0
  );
  const egressesSum = (egressesBefore || []).reduce(
    (sum, e) => sum + Number(e.total_amount || 0),
    0
  );

  return Number(account.initial_balance || 0) + paymentsSum - egressesSum;
}

/**
 * Listar todas las conciliaciones de un condominio
 */
export async function listReconciliations(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reconciliations")
    .select(
      `
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
    `
    )
    .eq("condominium_id", condominiumId)
    .order("cutoff_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    // Si la tabla no existe aún, retornar array vacío sin error
    let errorStr = "";
    let errorMessage = "";
    let errorCode = "";
    
    try {
      // Intentar obtener información del error de forma segura
      errorCode = error?.code || "";
      errorMessage = error?.message || String(error) || "";
      errorStr = JSON.stringify(error).toLowerCase();
    } catch {
      // Si no se puede serializar, usar el mensaje si existe
      errorMessage = String(error?.message || error || "");
      errorStr = errorMessage.toLowerCase();
    }
    
    // Verificar si la tabla no existe
    const isTableMissing =
      errorCode === "42P01" ||
      errorCode === "PGRST205" ||
      (errorMessage && errorMessage.toLowerCase().includes("does not exist")) ||
      (errorMessage && errorMessage.toLowerCase().includes("no existe")) ||
      (errorMessage && errorMessage.toLowerCase().includes("could not find the table")) ||
      (error?.hint && String(error.hint).toLowerCase().includes("does not exist")) ||
      (errorStr.includes("relation") && errorStr.includes("does not exist")) ||
      (errorStr.includes("relation") && errorStr.includes("reconciliations")) ||
      (errorStr.includes("could not find") && errorStr.includes("table"));

    if (isTableMissing) {
      // Tabla no existe aún, retornar array vacío silenciosamente
      return [];
    }
    
    // Otro tipo de error, loguear para debugging con información segura
    const errorInfo = {
      code: errorCode || "unknown",
      message: errorMessage || "Error desconocido",
      details: error?.details || null,
      hint: error?.hint || null,
      raw: error,
    };
    console.error("Error listando conciliaciones", errorInfo);
    return [];
  }

  return data || [];
}

/**
 * Obtener una conciliación por ID
 */
export async function getReconciliation(
  condominiumId: string,
  reconciliationId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reconciliations")
    .select(
      `
      *,
      financial_account:financial_accounts(bank_name, account_number)
    `
    )
    .eq("id", reconciliationId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo conciliación", error);
    return null;
  }

  return data;
}

/**
 * Crear una nueva conciliación
 */
export async function createReconciliation(
  condominiumId: string,
  input: ReconciliationInput
) {
  const parsed = reconciliationSchema.parse(input);
  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado" };

  const supabase = await createClient();

  // Obtener la última conciliación de esta cuenta para calcular el period_start
  const lastReconciliation = await getLastReconciliation(
    condominiumId,
    parsed.financial_account_id
  );

  // Calcular period_start: si hay conciliación anterior, es el día siguiente al cutoff_date
  // Si no hay, usar una fecha muy antigua o el saldo inicial de la cuenta
  let periodStart: string;
  let openingBalance: number;

  if (lastReconciliation && lastReconciliation.cutoff_date) {
    // Calcular el día siguiente a la última conciliación
    const lastDate = new Date(lastReconciliation.cutoff_date);
    lastDate.setDate(lastDate.getDate() + 1);
    periodStart = lastDate.toISOString().split("T")[0];
    
    // El saldo inicial es el closing_balance_calculated de la última conciliación
    openingBalance = Number(lastReconciliation.closing_balance_calculated || 0);
  } else {
    // Primera conciliación: usar el saldo inicial de la cuenta
    const account = await supabase
      .from("financial_accounts")
      .select("initial_balance")
      .eq("id", parsed.financial_account_id)
      .maybeSingle();

    if (!account.data) {
      return { error: "Cuenta bancaria no encontrada" };
    }

    // Para la primera conciliación, usar una fecha muy antigua
    periodStart = new Date("2000-01-01").toISOString().split("T")[0];
    openingBalance = Number(account.data.initial_balance || 0);
  }

  // period_end es igual a cutoff_date
  const periodEnd = parsed.cutoff_date;

  // Crear el registro
  console.log("Creando conciliación con datos:", {
    condominium_id: condominiumId,
    financial_account_id: parsed.financial_account_id,
    cutoff_date: parsed.cutoff_date,
    period_start: periodStart,
    period_end: periodEnd,
    opening_balance: openingBalance,
    closing_balance_bank: parsed.closing_balance_bank,
    notes: parsed.notes,
  });

  const { data: reconciliation, error } = await supabase
    .from("reconciliations")
    .insert({
      condominium_id: condominiumId,
      financial_account_id: parsed.financial_account_id,
      cutoff_date: parsed.cutoff_date,
      period_start: periodStart,
      period_end: periodEnd,
      opening_balance: openingBalance,
      closing_balance_bank: parsed.closing_balance_bank,
      closing_balance_calculated: openingBalance, // Se actualizará cuando se agreguen items
      difference: parsed.closing_balance_bank - openingBalance,
      status: "borrador",
      notes: parsed.notes || null, // Aquí va el nombre/detalle de la conciliación
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error creando conciliación:", {
      error,
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
    
    // Verificar si la tabla no existe
    const errorCode = error?.code || "";
    const errorMessage = String(error?.message || "").toLowerCase();
    const isTableMissing =
      errorCode === "42P01" ||
      errorCode === "PGRST205" ||
      errorMessage.includes("could not find the table") ||
      errorMessage.includes("does not exist");

    if (isTableMissing) {
      return { error: "La tabla de conciliaciones no existe. Por favor, ejecuta el script SQL para crear la tabla 'reconciliations'." };
    }

    // Verificar si es un error de constraint único (ya existe una conciliación con estos datos)
    const isUniqueConstraint =
      errorCode === "23505" ||
      errorMessage.includes("unique") ||
      errorMessage.includes("duplicate") ||
      (error?.details && String(error.details).includes("unique_reconciliation_per_account_date"));

    if (isUniqueConstraint) {
      // Buscar si ya existe una conciliación en borrador con estos datos
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
          error: "Ya existe una conciliación en borrador para esta cuenta y fecha de corte. Por favor, edita la conciliación existente o elimínala primero.",
          reconciliationId: existing.id 
        };
      }
      
      return { error: "Ya existe una conciliación finalizada para esta cuenta y fecha de corte." };
    }

    return { 
      error: error?.message || `Error al crear la conciliación: ${errorCode || "Error desconocido"}` 
    };
  }

  if (!reconciliation) {
    console.error("No se recibió respuesta al crear la conciliación");
    return { error: "No se recibió respuesta al crear la conciliación" };
  }

  revalidatePath(`/app/${condominiumId}/reconciliation`);
  return { success: true, reconciliationId: reconciliation.id };
}

/**
 * Guardar los items seleccionados de la conciliación
 */
export async function saveReconciliationItems(
  condominiumId: string,
  input: ReconciliationItemsInput
) {
  const parsed = reconciliationItemsSchema.parse(input);
  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado" };

  const supabase = await createClient();

  // Obtener la conciliación para calcular el saldo
  const { data: reconciliation } = await supabase
    .from("reconciliations")
    .select("period_start, financial_account_id")
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

  // Obtener montos de los pagos seleccionados
  const { data: payments } = await supabase
    .from("payments")
    .select("id, total_amount, payment_date")
    .in("id", parsed.selected_payments);

  // Obtener montos de los egresos seleccionados (solo los que tienen cheque cobrado o no tienen cheque)
  const egressIds = parsed.selected_egresses.map((e) => e.egress_id);
  const { data: egresses } = await supabase
    .from("egresses")
    .select("id, total_amount, payment_date")
    .in("id", egressIds);

  // Filtrar egresos: solo contar los que no tienen cheque o tienen cheque cobrado
  const egressesToCount = parsed.selected_egresses.filter(
    (e) => !e.check_id || e.is_check_cashed
  );
  const egressIdsToCount = egressesToCount.map((e) => e.egress_id);

  const paymentsSum = (payments || []).reduce(
    (sum, p) => sum + Number(p.total_amount || 0),
    0
  );
  const egressesSum = (egresses || [])
    .filter((e) => egressIdsToCount.includes(e.id))
    .reduce((sum, e) => sum + Number(e.total_amount || 0), 0);

  const calculatedBalance = initialBalance + paymentsSum - egressesSum;

  // Obtener el closing_balance_bank de la conciliación
  const { data: recon } = await supabase
    .from("reconciliations")
    .select("closing_balance_bank")
    .eq("id", parsed.reconciliation_id)
    .maybeSingle();

  const difference = (recon?.closing_balance_bank || 0) - calculatedBalance;

  // Borrar items anteriores de esta conciliación
  await supabase
    .from("reconciliation_items")
    .delete()
    .eq("reconciliation_id", parsed.reconciliation_id);

  // Obtener datos completos para el snapshot
  const { data: paymentsFull } = await supabase
    .from("payments")
    .select(
      `
      id,
      total_amount,
      payment_date,
      folio_rec,
      reference_number,
      unit:units(full_identifier)
    `
    )
    .in("id", parsed.selected_payments);

  const { data: egressesFull } = await supabase
    .from("egresses")
    .select(
      `
      id,
      total_amount,
      payment_date,
      folio_eg,
      reference_number,
      supplier:suppliers(name)
    `
    )
    .in("id", egressIds);

  // Crear items de pagos con snapshot
  const paymentItems = (paymentsFull || []).map((payment: any) => ({
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

  // Crear items de egresos con snapshot
  const egressItems = parsed.selected_egresses.map((egressItem) => {
    const egress = egressesFull?.find((e: any) => e.id === egressItem.egress_id);
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
  const { error: itemsError } = await supabase
    .from("reconciliation_items")
    .insert([...paymentItems, ...egressItems]);

  if (itemsError) {
    console.error("Error guardando items de conciliación", itemsError);
    return { error: "No se pudieron guardar los items" };
  }

  // Actualizar la conciliación con los cálculos
  const { error: updateError } = await supabase
    .from("reconciliations")
    .update({
      closing_balance_calculated: calculatedBalance,
      difference: difference,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.reconciliation_id);

  if (updateError) {
    console.error("Error actualizando conciliación", updateError);
    return { error: "No se pudo actualizar la conciliación" };
  }

  revalidatePath(`/app/${condominiumId}/reconciliation`);
  return { success: true, calculatedBalance, difference };
}

/**
 * Finalizar conciliación (marcar como conciliada)
 */
export async function finalizeReconciliation(
  condominiumId: string,
  reconciliationId: string
) {
  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado" };

  const supabase = await createClient();

  // Verificar que la conciliación existe y está en borrador
  const { data: reconciliation, error: checkError } = await supabase
    .from("reconciliations")
    .select("status, difference")
    .eq("id", reconciliationId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (checkError) {
    console.error("Error verificando conciliación", checkError);
    return { error: "No se pudo verificar la conciliación" };
  }

  if (!reconciliation) {
    return { error: "Conciliación no encontrada" };
  }

  if (reconciliation.status !== "borrador") {
    return { error: `La conciliación ya está ${reconciliation.status === "conciliada" ? "conciliada" : "cerrada"}` };
  }

  // Asegurar que el usuario tenga un perfil en la tabla profiles
  // Si no existe, crearlo automáticamente
  let reconciledByProfileId: string | null = null;
  
  if (user?.id) {
    // Primero verificar si existe el perfil
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    
    if (existingProfile) {
      reconciledByProfileId = existingProfile.id;
    } else {
      // Si no existe, crear el perfil automáticamente
      const userEmail = user.email || `user-${user.id}@edifika.local`;
      const userName = userEmail.split("@")[0];
      
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: userEmail,
          full_name: userName,
          first_name: userName.split(".")[0] || userName,
          last_name: userName.split(".").slice(1).join(" ") || "",
          is_legal_entity: false,
          preferences: { notify_news: true, channel: "email" },
        })
        .select("id")
        .single();
      
      if (createError) {
        console.error("Error creando perfil para usuario:", createError);
        // Si falla la creación, intentar obtener el perfil de nuevo (por si se creó en otro proceso)
        const { data: retryProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        
        if (retryProfile) {
          reconciledByProfileId = retryProfile.id;
        } else {
          return { error: "No se pudo crear el perfil del usuario. Por favor, contacta al administrador." };
        }
      } else {
        reconciledByProfileId = newProfile.id;
      }
    }
  }

  if (!reconciledByProfileId) {
    return { error: "No se pudo identificar el perfil del usuario para registrar quién finalizó la conciliación." };
  }

  // Verificar si hay diferencia antes de finalizar
  // Si hay diferencia, el estado debe ser "conciliada" pero se mostrará como "PENDIENTE" en la UI
  // Si no hay diferencia, se marca como "conciliada" y se muestra como "CONCILIADO"
  const { data: currentRecon } = await supabase
    .from("reconciliations")
    .select("difference")
    .eq("id", reconciliationId)
    .maybeSingle();

  const hasDifference = currentRecon ? Math.abs(currentRecon.difference) >= 0.01 : false;

  const { error } = await supabase
    .from("reconciliations")
    .update({
      status: "conciliada", // Siempre se marca como conciliada, pero la UI mostrará PENDIENTE si hay diferencia
      reconciled_at: new Date().toISOString(),
      reconciled_by: reconciledByProfileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reconciliationId)
    .eq("condominium_id", condominiumId)
    .eq("status", "borrador"); // Solo se puede finalizar si está en borrador

  if (error) {
    console.error("Error finalizando conciliación", {
      error,
      code: error?.code,
      message: error?.message,
      details: error?.details,
    });
    return { error: error?.message || "No se pudo finalizar la conciliación" };
  }

  revalidatePath(`/app/${condominiumId}/reconciliation`);
  return { success: true };
}

/**
 * Obtener items de una conciliación
 */
export async function getReconciliationItems(reconciliationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reconciliation_items")
    .select("*")
    .eq("reconciliation_id", reconciliationId);

  if (error) {
    console.error("Error obteniendo items de conciliación", error);
    return [];
  }

  return data || [];
}

/**
 * Borrar una conciliación (solo si está en borrador)
 */
export async function deleteReconciliation(
  condominiumId: string,
  reconciliationId: string
) {
  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado" };

  const supabase = await createClient();

  // Verificar que existe la conciliación
  const { data: reconciliation } = await supabase
    .from("reconciliations")
    .select("status")
    .eq("id", reconciliationId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!reconciliation) {
    return { error: "Conciliación no encontrada" };
  }

  // Permitir eliminar cualquier conciliación (borrador, conciliada, etc.)
  // No hay restricción de estado

  // Borrar (los items se borran en cascada)
  const { error } = await supabase
    .from("reconciliations")
    .delete()
    .eq("id", reconciliationId)
    .eq("condominium_id", condominiumId);

  if (error) {
    console.error("Error borrando conciliación", error);
    return { error: "No se pudo borrar la conciliación" };
  }

  revalidatePath(`/app/${condominiumId}/reconciliation`);
  return { success: true };
}

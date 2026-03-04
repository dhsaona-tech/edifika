import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { readFile } from "fs/promises";
import { join } from "path";
import ReconciliationPdfTemplate from "@/app/app/[id]/reconciliation/components/ReconciliationPdfTemplate";
import type { ReconciliationItemRow, CheckInTransitRow } from "@/app/app/[id]/reconciliation/components/ReconciliationPdfTemplate";

export const revalidate = 0;

type ParamsArg = { id: string } | Promise<{ id: string }>;

/* ── Helper: fecha en español ── */
function formatDateEs(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  try {
    const d = new Date(dateStr + "T12:00:00");
    return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  try {
    const d = new Date(dateStr + "T12:00:00");
    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateStr;
  }
}

function formatPeriodToMonth(period: string | null): string {
  if (!period) return "";
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  try {
    const normalized = period.length <= 7 ? period + "-01" : period;
    const d = new Date(normalized + "T12:00:00");
    if (isNaN(d.getTime())) return period;
    return months[d.getMonth()];
  } catch {
    return period;
  }
}

export async function GET(req: NextRequest, ctx: { params: ParamsArg }) {
  const resolved = await ctx.params;
  const reconciliationId = resolved.id;
  const { searchParams } = new URL(req.url);
  const condominiumId = searchParams.get("condominiumId");

  if (!condominiumId) {
    return NextResponse.json({ error: "Falta condominiumId" }, { status: 400 });
  }

  const supabase = await createClient();

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();

  // ──────────── 1. Queries paralelas ────────────
  const [reconciliationRes, condoRes, auditRes] = await Promise.all([
    supabase
      .from("reconciliations")
      .select(`
        *,
        financial_account:financial_accounts(bank_name, account_number)
      `)
      .eq("id", reconciliationId)
      .eq("condominium_id", condominiumId)
      .maybeSingle(),
    supabase
      .from("condominiums")
      .select("name, logo_url, fiscal_id, address, phone")
      .eq("id", condominiumId)
      .maybeSingle(),
    supabaseAdmin
      .from("audit_logs")
      .select("performed_by")
      .eq("table_name", "reconciliations")
      .eq("record_id", reconciliationId)
      .eq("action", "CREATE")
      .order("performed_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (reconciliationRes.error || !reconciliationRes.data) {
    return NextResponse.json({ error: "Conciliaci\u00F3n no encontrada" }, { status: 404 });
  }

  const reconciliation = reconciliationRes.data;
  const condo = condoRes.data;

  // ──────────── 2. Items de la conciliación (con JOINs enriquecidos) ────────────
  const { data: items } = await supabase
    .from("reconciliation_items")
    .select(`
      *,
      payment:payments(
        folio_rec, payment_method, billing_name,
        unit:units(full_identifier, identifier)
      ),
      egress:egresses(
        folio_eg, payment_method, supplier_snapshot_name,
        supplier:suppliers(name)
      ),
      check:checks(check_number)
    `)
    .eq("reconciliation_id", reconciliationId)
    .order("transaction_date", { ascending: true });

  // ──────────── 3. Resolver nombre del creador ────────────
  let creatorName: string | null = null;
  const auditRow = auditRes.data as { performed_by: string } | null;
  if (auditRow?.performed_by) {
    const { data: creatorProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", auditRow.performed_by)
      .maybeSingle();
    creatorName = (creatorProfile as { full_name: string } | null)?.full_name || null;
  }

  // ──────────── 4. Separar items ────────────
  const allItems = items || [];
  const ingresos = allItems.filter((item: any) => item.transaction_type === "ingreso");
  const egresos = allItems.filter((item: any) => item.transaction_type === "egreso");
  const chequesEnTransitoRaw = egresos.filter((item: any) => item.check_id && !item.is_check_cashed);
  const egresosContabilizados = egresos.filter((item: any) => !item.check_id || item.is_check_cashed);

  // ──────────── 4b. Detalle de pagos (allocaciones → cargos) ────────────
  const paymentIds = allItems
    .filter((item: any) => item.payment_id)
    .map((item: any) => item.payment_id);

  const detailByPayment: Record<string, string> = {};
  if (paymentIds.length > 0) {
    const { data: allocations } = await supabase
      .from("payment_allocations")
      .select(`
        payment_id,
        charge:charges(period, expense_item:expense_items(name))
      `)
      .in("payment_id", paymentIds);

    if (allocations) {
      for (const alloc of allocations as any[]) {
        const name = alloc.charge?.expense_item?.name || "";
        const monthName = formatPeriodToMonth(alloc.charge?.period || null);
        const desc = name ? `${name} ${monthName}`.trim() : monthName;
        if (!desc) continue;

        if (!detailByPayment[alloc.payment_id]) {
          detailByPayment[alloc.payment_id] = desc;
        } else if (!detailByPayment[alloc.payment_id].includes(desc)) {
          detailByPayment[alloc.payment_id] += `, ${desc}`;
        }
      }
    }
  }

  // ──────────── 4c. Detalle de egresos (allocaciones → órdenes de pago) ────────────
  const egressIds = allItems
    .filter((item: any) => item.egress_id)
    .map((item: any) => item.egress_id);

  const detailByEgress: Record<string, string> = {};
  if (egressIds.length > 0) {
    const { data: egressAllocs } = await supabase
      .from("egress_allocations")
      .select(`
        egress_id,
        payable_order:payable_orders(description)
      `)
      .in("egress_id", egressIds);

    if (egressAllocs) {
      for (const alloc of egressAllocs as any[]) {
        const desc = alloc.payable_order?.description || "";
        if (!desc) continue;

        if (!detailByEgress[alloc.egress_id]) {
          detailByEgress[alloc.egress_id] = desc;
        } else if (!detailByEgress[alloc.egress_id].includes(desc)) {
          detailByEgress[alloc.egress_id] += `, ${desc}`;
        }
      }
    }
  }

  // ──────────── 5. Calcular totales ────────────
  const totalIngresos = ingresos.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
  const totalEgresosContabilizados = egresosContabilizados.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
  const totalChequesTransito = chequesEnTransitoRaw.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);

  const saldoInicial = Number(reconciliation.opening_balance || 0);
  const saldoEnLibros = saldoInicial + totalIngresos - totalEgresosContabilizados;
  const saldoBanco = Number(reconciliation.closing_balance_bank || 0);
  const diferencia = Number(reconciliation.difference || 0);
  const isDiferenciaCero = Math.abs(diferencia) < 0.01;

  // ──────────── 6. Logos como base64 ────────────
  let edifikaLogoBase64: string | null = null;
  const edifikaLogoCandidates = [
    "EDIFIKA LOGO FONDO BLANCO.png",
    "edifika-logo.png",
    "edifika-logo.jpg",
    "edifika-logo.svg",
    "edifika-logo.webp",
  ];
  for (const fileName of edifikaLogoCandidates) {
    try {
      const logoPath = join(process.cwd(), "public", "logos", fileName);
      const logoBuffer = await readFile(logoPath);
      const ext = fileName.split(".").pop()?.toLowerCase() || "png";
      const mimeType = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
      edifikaLogoBase64 = `data:${mimeType};base64,${logoBuffer.toString("base64")}`;
      break;
    } catch {
      // Next candidate
    }
  }

  let condoLogoBase64: string | null = null;
  if (condo?.logo_url) {
    try {
      const logoUrl = condo.logo_url;
      const fullUrl = logoUrl.startsWith("http")
        ? logoUrl
        : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${logoUrl}`;
      const res = await fetch(fullUrl);
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") || "image/png";
        condoLogoBase64 = `data:${contentType};base64,${buffer.toString("base64")}`;
      }
    } catch {
      // Fallback: text name
    }
  }

  // ──────────── 7. Preparar datos para el template ────────────
  const cutoffDateFormatted = formatDateEs(reconciliation.cutoff_date);
  const periodStartFormatted = formatDateEs(reconciliation.period_start);
  const periodEndFormatted = formatDateEs(reconciliation.cutoff_date);

  // Determinar descripción del período (ej. "MARZO 2025")
  let periodDescription: string | null = null;
  if (reconciliation.cutoff_date) {
    try {
      const monthNames = [
        "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
        "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
      ];
      const d = new Date(reconciliation.cutoff_date + "T12:00:00");
      periodDescription = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    } catch { /* */ }
  }

  // Map items for the enriched 8-column template
  const templateItems: ReconciliationItemRow[] = allItems.map((item: any) => {
    const isIngreso = item.transaction_type === "ingreso";

    // Contact: billing_name (snapshot) > supplier_snapshot_name > supplier.name > description fallback
    let contact = "\u2014";
    if (isIngreso) {
      contact = item.payment?.billing_name
        || item.description?.split(",")[0]?.trim()
        || "\u2014";
    } else {
      contact = item.egress?.supplier_snapshot_name
        || item.egress?.supplier?.name
        || item.description?.split(",")[0]?.trim()
        || "\u2014";
    }

    // Unit: only for ingresos (payments linked to a unit)
    const unit = isIngreso
      ? (item.payment?.unit?.full_identifier || item.payment?.unit?.identifier || "\u2014")
      : "\u2014";

    // Comprobante: zero-padded folio number
    const comprobante = isIngreso
      ? (item.payment?.folio_rec ? String(item.payment.folio_rec).padStart(4, "0") : "\u2014")
      : (item.egress?.folio_eg ? String(item.egress.folio_eg).padStart(4, "0") : "\u2014");

    // Detail: payment allocations for ingresos, payable order description for egresos
    let detail = "\u2014";
    if (isIngreso && item.payment_id && detailByPayment[item.payment_id]) {
      detail = detailByPayment[item.payment_id];
    } else if (!isIngreso && item.egress_id && detailByEgress[item.egress_id]) {
      detail = detailByEgress[item.egress_id];
    } else {
      detail = item.description || "\u2014";
    }

    // Payment method with (+) or (-) indicator
    let paymentMethod = "\u2014";
    if (isIngreso) {
      const method = item.payment?.payment_method;
      paymentMethod = method ? `${method} (+)` : "(+)";
    } else {
      let method: string | null = null;
      if (item.check_id && item.check?.check_number) {
        method = `Cheque #${item.check.check_number}`;
      } else {
        method = item.egress?.payment_method || null;
      }
      paymentMethod = method ? `${method} (-)` : "(-)";
    }

    return {
      date: formatDateShort(item.transaction_date),
      comprobante,
      contact,
      unit,
      detail,
      nroDocumento: item.reference_number || "\u2014",
      paymentMethod,
      type: item.transaction_type as "ingreso" | "egreso",
      amount: formatCurrency(item.amount || 0),
      isCheckPending: Boolean(item.check_id && !item.is_check_cashed),
    };
  });

  const templateCheques: CheckInTransitRow[] = chequesEnTransitoRaw.map((item: any) => ({
    date: formatDateShort(item.transaction_date),
    reference: item.reference_number || "\u2014",
    description: item.description || "\u2014",
    amount: formatCurrency(item.amount || 0),
  }));

  // ──────────── 8. Render PDF ────────────
  const element = React.createElement(ReconciliationPdfTemplate, {
    condo: {
      name: condo?.name || "Condominio",
      logoUrl: condoLogoBase64,
      ruc: condo?.fiscal_id || null,
      address: condo?.address || null,
      phone: condo?.phone || null,
    },
    edifikaLogoUrl: edifikaLogoBase64,
    creatorName,
    reconciliation: {
      cutoffDate: cutoffDateFormatted,
      periodStart: periodStartFormatted,
      periodEnd: periodEndFormatted,
      accountName: reconciliation.financial_account?.bank_name || "Cuenta",
      accountNumber: reconciliation.financial_account?.account_number || null,
      status: reconciliation.status,
      statusLabel: reconciliation.status === "conciliada" ? "CONCILIADA" : "BORRADOR",
      notes: reconciliation.notes || null,
      description: periodDescription,
    },
    summary: {
      saldoInicial: formatCurrency(saldoInicial),
      totalIngresos: formatCurrency(totalIngresos),
      totalEgresos: formatCurrency(totalEgresosContabilizados),
      totalChequesTransito: formatCurrency(totalChequesTransito),
      chequesTransitoCount: chequesEnTransitoRaw.length,
      saldoEnLibros: formatCurrency(saldoEnLibros),
      saldoBanco: formatCurrency(saldoBanco),
      diferencia: formatCurrency(diferencia),
      isDiferenciaCero,
    },
    items: templateItems,
    chequesEnTransito: templateCheques,
  });

  // @ts-expect-error — @react-pdf types expect DocumentProps but component wraps Document internally
  const pdfBuffer = await renderToBuffer(element);

  // ──────────── 9. Respond ────────────
  const cutoffShort = formatDateShort(reconciliation.cutoff_date).replace(/\//g, "-");
  const filename = `conciliacion-${cutoffShort}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}

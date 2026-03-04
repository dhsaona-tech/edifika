import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCarteraData } from "@/lib/cartera/getCarteraData";
import { readFile } from "fs/promises";
import { join } from "path";
import { createClient } from "@/lib/supabase/server";
import AccountStatementPdfTemplate from "@/app/app/[id]/units/[unitId]/components/AccountStatementPdfTemplate";
import type { AccountStatementRow } from "@/app/app/[id]/units/[unitId]/components/AccountStatementPdfTemplate";

export const dynamic = "force-dynamic";

/* ── Helpers ── */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  try {
    const normalized = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
    const date = new Date(normalized + "T00:00:00");
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("es-EC", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatDateEs(dateStr: string): string {
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

const chargeTypeLabels: Record<string, string> = {
  expensa_mensual: "1.1 Expensa Mensual",
  servicio_basico: "1.2 Servicio Básico",
  consumo_agua: "1.3 Consumo de agua potable",
  extraordinaria_masiva: "3.3 Cuota Extraordinaria",
  saldo_inicial: "0.1 Saldo Inicial",
  multa: "2.1 Multa",
  reserva: "2.2 Reserva",
  interest: "2.3 Mora",
  otro: "9.9 Otro",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    const { unitId } = await params;
    const { searchParams } = new URL(request.url);
    const condominiumId = searchParams.get("condominiumId");
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const status = searchParams.get("status") || undefined;

    if (!condominiumId) {
      return NextResponse.json({ error: "condominiumId requerido" }, { status: 400 });
    }

    // Verificar autenticación
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const cartera = await getCarteraData(condominiumId, unitId, { from, to, status });

    if (!cartera) {
      return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
    }

    const { unit, owner, condominium, summary, charges, payments } = cartera;

    // ──────────── 1. Logos como base64 ────────────
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
        // Intentar siguiente candidato
      }
    }

    // Logo del condominio
    let condoLogoBase64: string | null = null;
    const supabase = await createClient();
    const { data: condo } = await supabase
      .from("condominiums")
      .select("logo_url, phone, fiscal_id")
      .eq("id", condominiumId)
      .maybeSingle();

    if (condo?.logo_url) {
      try {
        const logoUrl = condo.logo_url.startsWith("http")
          ? condo.logo_url
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${condo.logo_url}`;
        const res = await fetch(logoUrl);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          const contentType = res.headers.get("content-type") || "image/png";
          condoLogoBase64 = `data:${contentType};base64,${buffer.toString("base64")}`;
        }
      } catch {
        // Fallback: usará texto del nombre
      }
    }

    // ──────────── 2. Crear mapa de pagos por cargo ────────────
    const paymentsByChargeId = new Map<string, Array<{
      payment_date: string;
      folio_rec: number | null;
      amount_allocated: number;
    }>>();

    payments.forEach(p => {
      p.allocations.forEach(a => {
        if (!paymentsByChargeId.has(a.charge_id)) {
          paymentsByChargeId.set(a.charge_id, []);
        }
        paymentsByChargeId.get(a.charge_id)!.push({
          payment_date: p.payment_date,
          folio_rec: p.folio_rec,
          amount_allocated: a.amount_allocated,
        });
      });
    });

    // ──────────── 3. Construir filas de la tabla ────────────
    const tableRows: AccountStatementRow[] = [];

    const sortedCharges = [...charges].sort((a, b) => {
      const dateA = a.period || a.posted_date;
      const dateB = b.period || b.posted_date;
      return dateA.localeCompare(dateB);
    });

    sortedCharges.forEach(charge => {
      const chargePayments = paymentsByChargeId.get(charge.id) || [];

      if (chargePayments.length === 0) {
        tableRows.push({
          contacto: owner.full_name,
          rubro: chargeTypeLabels[charge.charge_type] || charge.charge_type,
          detalle: charge.description || charge.expense_item_name || "",
          valor: formatCurrency(charge.total_amount),
          fechaPago: "",
          nroRecibo: "",
          valorPagado: "$0.00",
          descuento: "$0.00",
          saldo: formatCurrency(charge.balance),
          saldoNumerico: charge.balance,
        });
      } else {
        let runningBalance = charge.total_amount;

        chargePayments.forEach((payment, idx) => {
          runningBalance -= payment.amount_allocated;

          tableRows.push({
            contacto: idx === 0 ? owner.full_name : "",
            rubro: idx === 0 ? (chargeTypeLabels[charge.charge_type] || charge.charge_type) : "",
            detalle: idx === 0 ? (charge.description || charge.expense_item_name || "") : "",
            valor: idx === 0 ? formatCurrency(charge.total_amount) : "",
            fechaPago: formatDate(payment.payment_date),
            nroRecibo: payment.folio_rec ? String(payment.folio_rec) : "",
            valorPagado: formatCurrency(payment.amount_allocated),
            descuento: "$0.00",
            saldo: formatCurrency(Math.max(0, runningBalance)),
            saldoNumerico: Math.max(0, runningBalance),
            isPaymentRow: idx > 0,
          });
        });
      }
    });

    // ──────────── 4. Filter label ────────────
    const filterParts: string[] = [];
    if (from) filterParts.push(`Desde: ${formatDate(from)}`);
    if (to) filterParts.push(`Hasta: ${formatDate(to)}`);
    if (status) filterParts.push(`Estado: ${status}`);
    const filterLabel = filterParts.length > 0 ? filterParts.join(" | ") : null;

    // ──────────── 5. Generar fecha formateada ────────────
    const now = new Date();
    const generatedAt = `${now.toLocaleDateString("es-EC")} ${now.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}`;

    // ──────────── 6. Render PDF ────────────
    const element = React.createElement(AccountStatementPdfTemplate, {
      condo: {
        name: condominium.name,
        logoUrl: condoLogoBase64,
        ruc: condo?.fiscal_id || null,
        address: condominium.address,
        phone: condo?.phone || null,
      },
      edifikaLogoUrl: edifikaLogoBase64,
      unit: {
        identifier: unit.identifier,
        fullIdentifier: unit.full_identifier,
        type: unit.type,
        aliquot: unit.aliquot,
      },
      owner: {
        name: owner.full_name,
        email: owner.email,
        phone: owner.phone,
      },
      summary: {
        totalCharges: formatCurrency(summary.total_charges),
        totalPaid: formatCurrency(summary.total_paid),
        totalPending: formatCurrency(summary.total_pending),
        totalOverdue: formatCurrency(summary.total_overdue),
        creditBalance: formatCurrency(summary.credit_balance),
        isOverdue: summary.total_overdue > 0,
      },
      rows: tableRows,
      generatedAt,
      filterLabel,
    });

    // @ts-expect-error — @react-pdf types expect DocumentProps but component wraps Document internally
    const pdfBuffer = await renderToBuffer(element);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="estado-cuenta-${unit.identifier}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generando PDF de estado de cuenta:", error);
    return NextResponse.json(
      { error: "Error generando PDF", details: String(error) },
      { status: 500 }
    );
  }
}

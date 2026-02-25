import { NextRequest, NextResponse } from "next/server";
import { getCarteraData } from "@/lib/cartera/getCarteraData";
import puppeteer from "puppeteer";

export const dynamic = "force-dynamic";

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

    const cartera = await getCarteraData(condominiumId, unitId, { from, to, status });

    if (!cartera) {
      return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
    }

    const { unit, owner, condominium, summary, charges, payments } = cartera;
    const now = new Date();

    // Crear mapa de pagos por cargo para mostrar los recibos
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

    // Construir las filas de la tabla
    // Cada cargo puede tener múltiples pagos, cada pago se muestra en su propia fila
    interface TableRow {
      contacto: string;
      rubro: string;
      detalle: string;
      valor: string;
      fecha_pago: string;
      nro_recibo: string;
      valor_pagado: string;
      descuento: string;
      saldo: string;
      isPaymentRow?: boolean;
    }

    const tableRows: TableRow[] = [];

    // Ordenar cargos por fecha (más antiguos primero para el PDF)
    const sortedCharges = [...charges].sort((a, b) => {
      const dateA = a.period || a.posted_date;
      const dateB = b.period || b.posted_date;
      return dateA.localeCompare(dateB);
    });

    sortedCharges.forEach(charge => {
      const chargePayments = paymentsByChargeId.get(charge.id) || [];

      if (chargePayments.length === 0) {
        // Cargo sin pagos
        tableRows.push({
          contacto: owner.full_name,
          rubro: chargeTypeLabels[charge.charge_type] || charge.charge_type,
          detalle: charge.description || charge.expense_item_name || "",
          valor: formatCurrency(charge.total_amount),
          fecha_pago: "",
          nro_recibo: "",
          valor_pagado: "$0.00",
          descuento: "$0.00",
          saldo: formatCurrency(charge.balance),
        });
      } else {
        // Cargo con pagos - primera fila muestra el cargo y primer pago
        let runningBalance = charge.total_amount;

        chargePayments.forEach((payment, idx) => {
          runningBalance -= payment.amount_allocated;

          tableRows.push({
            contacto: idx === 0 ? owner.full_name : "",
            rubro: idx === 0 ? (chargeTypeLabels[charge.charge_type] || charge.charge_type) : "",
            detalle: idx === 0 ? (charge.description || charge.expense_item_name || "") : "",
            valor: idx === 0 ? formatCurrency(charge.total_amount) : "",
            fecha_pago: formatDate(payment.payment_date),
            nro_recibo: payment.folio_rec ? String(payment.folio_rec) : "",
            valor_pagado: formatCurrency(payment.amount_allocated),
            descuento: "$0.00",
            saldo: formatCurrency(Math.max(0, runningBalance)),
            isPaymentRow: idx > 0,
          });
        });
      }
    });

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Estado de Cuenta - ${unit.full_identifier || unit.identifier}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9px;
      line-height: 1.3;
      color: #333;
      background: white;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
      border-bottom: 2px solid #4a5568;
      padding-bottom: 10px;
    }
    .logo-section h1 {
      font-size: 18px;
      color: #2d3748;
      margin-bottom: 3px;
    }
    .logo-section .subtitle {
      font-size: 10px;
      color: #718096;
    }
    .date-section {
      text-align: right;
      font-size: 9px;
      color: #718096;
    }
    .date-section strong {
      color: #2d3748;
    }

    .title-section {
      text-align: center;
      margin: 15px 0;
    }
    .title-section h2 {
      font-size: 16px;
      color: #2d3748;
      margin-bottom: 8px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin-bottom: 5px;
    }
    .info-row .item {
      display: flex;
      gap: 5px;
    }
    .info-row .label {
      font-weight: bold;
      color: #4a5568;
    }
    .info-row .value {
      color: #2d3748;
    }
    .info-row .mora {
      color: ${summary.total_overdue > 0 ? '#c53030' : '#38a169'};
      font-weight: bold;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 8px;
    }
    th {
      background: #4a5568;
      color: white;
      padding: 6px 4px;
      text-align: left;
      font-weight: 600;
      font-size: 8px;
      border: 1px solid #4a5568;
    }
    th.right {
      text-align: right;
    }
    td {
      padding: 5px 4px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    td.right {
      text-align: right;
    }
    tr:nth-child(even) {
      background: #f7fafc;
    }
    tr.payment-row td {
      border-top: none;
      padding-top: 2px;
    }
    .saldo-pendiente {
      color: #c53030;
      font-weight: bold;
    }
    .saldo-cero {
      color: #38a169;
    }

    .summary-section {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
    }
    .summary-box {
      border: 1px solid #e2e8f0;
      padding: 10px;
      min-width: 180px;
    }
    .summary-box h4 {
      font-size: 9px;
      color: #4a5568;
      margin-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      margin-bottom: 3px;
    }
    .summary-row.total {
      font-weight: bold;
      border-top: 1px solid #e2e8f0;
      padding-top: 5px;
      margin-top: 5px;
    }
    .summary-row .negative {
      color: #c53030;
    }
    .summary-note {
      font-size: 8px;
      color: #718096;
      margin-top: 5px;
    }

    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 7px;
      color: #a0aec0;
    }
    .footer-eco {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      margin-top: 5px;
    }
    .page-number {
      position: fixed;
      bottom: 10mm;
      right: 10mm;
      font-size: 8px;
      color: #a0aec0;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="page-header">
    <div class="logo-section">
      <h1>${condominium.name}</h1>
      <div class="subtitle">${condominium.address || ""}</div>
    </div>
    <div class="date-section">
      <div><strong>Fecha:</strong> ${now.toLocaleDateString("es-EC")}</div>
      <div><strong>Hora:</strong> ${now.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
    </div>
  </div>

  <!-- Title -->
  <div class="title-section">
    <h2>Estado de Cuenta de la Unidad</h2>
    <div class="info-row">
      <div class="item">
        <span class="label">Unidad:</span>
        <span class="value">${unit.full_identifier || `${unit.type} ${unit.identifier}`}</span>
      </div>
      <div class="item">
        <span class="label">Representante:</span>
        <span class="value">${owner.full_name}</span>
      </div>
      <div class="item">
        <span class="label">¿Está en mora?:</span>
        <span class="mora">${summary.total_overdue > 0 ? "Sí" : "No"}</span>
      </div>
      <div class="item">
        <span class="label">Porcentaje de alícuota:</span>
        <span class="value">${unit.aliquot.toFixed(6)}%</span>
      </div>
    </div>
  </div>

  <!-- Table -->
  <table>
    <thead>
      <tr>
        <th style="width: 15%">Contacto</th>
        <th style="width: 14%">Rubro</th>
        <th style="width: 20%">Detalle</th>
        <th class="right" style="width: 8%">Valor</th>
        <th style="width: 9%">Fecha pago</th>
        <th style="width: 8%">Nro. Recibo</th>
        <th class="right" style="width: 9%">Valor pagado</th>
        <th class="right" style="width: 7%">Desct</th>
        <th class="right" style="width: 10%">Saldo</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows.map(row => `
        <tr class="${row.isPaymentRow ? 'payment-row' : ''}">
          <td>${row.contacto}</td>
          <td>${row.rubro}</td>
          <td>${row.detalle}</td>
          <td class="right">${row.valor}</td>
          <td>${row.fecha_pago}</td>
          <td>${row.nro_recibo}</td>
          <td class="right">${row.valor_pagado}</td>
          <td class="right">${row.descuento}</td>
          <td class="right ${parseFloat(row.saldo.replace(/[^0-9.-]/g, '')) > 0.01 ? 'saldo-pendiente' : 'saldo-cero'}">${row.saldo}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <!-- Summary -->
  <div class="summary-section">
    <div class="summary-box">
      <h4>RESUMEN</h4>
      <div class="summary-row">
        <span>(1) Total Pendiente de Pago</span>
        <span>${summary.total_pending.toFixed(2)}</span>
      </div>
      <div class="summary-row total">
        <span>(3) SALDO POR PAGAR</span>
        <span class="${summary.total_pending > 0 ? 'negative' : ''}">${summary.total_pending.toFixed(2)}</span>
      </div>
      <div class="summary-note">* Los valores negativos (-) indican saldo a favor.</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-eco">
      <span>🌿</span>
      <span>Este documento es digital: No lo imprimas si no es necesario. Cuidemos nuestro planeta</span>
    </div>
  </div>
</body>
</html>
`;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 15000 });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "15mm", left: "10mm" },
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
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

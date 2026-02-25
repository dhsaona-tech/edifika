import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { readFile } from "fs/promises";
import { join } from "path";

export const revalidate = 0;

type ParamsArg = { id: string } | Promise<{ id: string }>;

export async function GET(req: NextRequest, ctx: { params: ParamsArg }) {
  const resolved = await ctx.params;
  const reconciliationId = resolved.id;
  const { searchParams } = new URL(req.url);
  const condominiumId = searchParams.get("condominiumId");

  if (!condominiumId) {
    return NextResponse.json({ error: "Falta condominiumId" }, { status: 400 });
  }

  const supabase = await createClient();

  // Obtener la conciliación con toda la información
  const { data: reconciliation, error } = await supabase
    .from("reconciliations")
    .select(`
      *,
      financial_account:financial_accounts(bank_name, account_number)
    `)
    .eq("id", reconciliationId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (error || !reconciliation) {
    return NextResponse.json({ error: "Conciliación no encontrada" }, { status: 404 });
  }

  // Obtener los items de la conciliación
  const { data: items } = await supabase
    .from("reconciliation_items")
    .select("*")
    .eq("reconciliation_id", reconciliationId)
    .order("transaction_date", { ascending: true });

  // Obtener datos del condominio
  const { data: condo } = await supabase
    .from("condominiums")
    .select("name, logo_url, fiscal_id, address, phone")
    .eq("id", condominiumId)
    .maybeSingle();

  // Separar items en ingresos y egresos
  const ingresos = (items || []).filter((item) => item.transaction_type === "ingreso");
  const egresos = (items || []).filter((item) => item.transaction_type === "egreso");

  // Identificar cheques en tránsito (egresos con cheque no cobrado)
  const chequesEnTransito = egresos.filter((item) => item.check_id && !item.is_check_cashed);
  const egresosContabilizados = egresos.filter((item) => !item.check_id || item.is_check_cashed);

  // Calcular totales
  const totalIngresos = ingresos.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalEgresosContabilizados = egresosContabilizados.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalChequesTransito = chequesEnTransito.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const saldoInicial = Number(reconciliation.opening_balance || 0);
  const saldoEnLibros = saldoInicial + totalIngresos - totalEgresosContabilizados;
  const saldoBanco = Number(reconciliation.closing_balance_bank || 0);

  // Leer el logo de EDIFIKA como base64
  let edifikaLogoBase64 = "";
  try {
    const logoPath = join(process.cwd(), "public", "logos", "edifika-logo.png");
    const logoBuffer = await readFile(logoPath);
    edifikaLogoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch {
    // Intentar otros formatos
    const formats = ["jpg", "svg", "webp"];
    for (const format of formats) {
      try {
        const logoPath = join(process.cwd(), "public", "logos", `edifika-logo.${format}`);
        const logoBuffer = await readFile(logoPath);
        const mimeType = format === "svg" ? "image/svg+xml" : `image/${format}`;
        edifikaLogoBase64 = `data:${mimeType};base64,${logoBuffer.toString("base64")}`;
        break;
      } catch {
        // Continuar con el siguiente formato
      }
    }
  }

  // Formatear fechas
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const cutoffDate = formatDate(reconciliation.cutoff_date);
  const periodStart = formatDate(reconciliation.period_start);
  const reconciledAt = reconciliation.reconciled_at
    ? formatDate(reconciliation.reconciled_at)
    : "-";

  // Generar HTML del PDF
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 10px;
      line-height: 1.4;
      color: #333;
      padding: 10mm;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #2563eb;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .logo {
      max-height: 50px;
      max-width: 120px;
    }
    .company-info h1 {
      font-size: 16px;
      color: #1e40af;
      margin-bottom: 2px;
    }
    .company-info p {
      font-size: 9px;
      color: #666;
    }
    .header-right {
      text-align: right;
    }
    .doc-title {
      font-size: 14px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 5px;
    }
    .doc-info {
      font-size: 9px;
      color: #666;
    }
    .summary-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px dashed #e2e8f0;
    }
    .summary-item.highlight {
      background: #dbeafe;
      padding: 8px;
      border-radius: 4px;
      border: none;
      font-weight: bold;
    }
    .summary-item.success {
      background: #dcfce7;
      color: #166534;
    }
    .summary-item.warning {
      background: #fef3c7;
      color: #92400e;
    }
    .summary-label {
      color: #64748b;
      font-size: 9px;
    }
    .summary-value {
      font-weight: 600;
      font-size: 11px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 12px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e2e8f0;
    }
    .section-title.transit {
      color: #b45309;
      border-bottom-color: #fbbf24;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }
    th {
      background: #f1f5f9;
      padding: 8px 6px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    td {
      padding: 6px;
      border-bottom: 1px solid #f1f5f9;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .amount {
      font-family: 'Courier New', monospace;
      font-weight: 600;
    }
    .amount.positive {
      color: #166534;
    }
    .amount.negative {
      color: #dc2626;
    }
    .total-row {
      background: #f1f5f9 !important;
      font-weight: bold;
    }
    .total-row td {
      border-top: 2px solid #cbd5e1;
      padding-top: 10px;
    }
    .cruce-final {
      background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 15px;
      margin-top: 20px;
    }
    .cruce-title {
      font-size: 12px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
      text-align: center;
    }
    .cruce-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr auto 1fr;
      align-items: center;
      gap: 10px;
      text-align: center;
    }
    .cruce-item {
      background: white;
      padding: 10px;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .cruce-label {
      font-size: 8px;
      color: #64748b;
      margin-bottom: 3px;
    }
    .cruce-value {
      font-size: 14px;
      font-weight: bold;
      color: #1e40af;
    }
    .cruce-op {
      font-size: 18px;
      font-weight: bold;
      color: #64748b;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #94a3b8;
    }
    .signature-area {
      margin-top: 40px;
      display: flex;
      justify-content: space-around;
    }
    .signature-box {
      text-align: center;
      width: 200px;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 40px;
      padding-top: 5px;
      font-size: 9px;
    }
    .no-items {
      text-align: center;
      padding: 20px;
      color: #94a3b8;
      font-style: italic;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: bold;
    }
    .status-conciliada {
      background: #dcfce7;
      color: #166534;
    }
    .status-borrador {
      background: #fef3c7;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${edifikaLogoBase64 ? `<img src="${edifikaLogoBase64}" class="logo" alt="Logo">` : ""}
      <div class="company-info">
        <h1>${condo?.name || "Condominio"}</h1>
        ${condo?.fiscal_id ? `<p>RUC: ${condo.fiscal_id}</p>` : ""}
        ${condo?.address ? `<p>${condo.address}</p>` : ""}
      </div>
    </div>
    <div class="header-right">
      <div class="doc-title">CONCILIACIÓN BANCARIA</div>
      <div class="doc-info">
        <strong>Cuenta:</strong> ${reconciliation.financial_account?.bank_name || ""} ${reconciliation.financial_account?.account_number || ""}<br>
        <strong>Fecha de Corte:</strong> ${cutoffDate}<br>
        <strong>Período:</strong> ${periodStart} - ${cutoffDate}<br>
        <span class="status-badge ${reconciliation.status === "conciliada" ? "status-conciliada" : "status-borrador"}">
          ${reconciliation.status === "conciliada" ? "CONCILIADA" : "BORRADOR"}
        </span>
      </div>
    </div>
  </div>

  <!-- Resumen de Totales -->
  <div class="summary-box">
    <div class="summary-grid">
      <div>
        <div class="summary-item">
          <span class="summary-label">Saldo Inicial Conciliado</span>
          <span class="summary-value">${formatCurrency(saldoInicial)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">(+) Depósitos Conciliados</span>
          <span class="summary-value amount positive">+${formatCurrency(totalIngresos)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">(-) Retiros Conciliados</span>
          <span class="summary-value amount negative">-${formatCurrency(totalEgresosContabilizados)}</span>
        </div>
        <div class="summary-item highlight">
          <span class="summary-label">= Saldo en Libros</span>
          <span class="summary-value">${formatCurrency(saldoEnLibros)}</span>
        </div>
      </div>
      <div>
        <div class="summary-item">
          <span class="summary-label">Cheques Girados No Cobrados</span>
          <span class="summary-value">${chequesEnTransito.length} cheques</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Cheques en Tránsito</span>
          <span class="summary-value amount">${formatCurrency(totalChequesTransito)}</span>
        </div>
        <div class="summary-item highlight ${Math.abs(Number(reconciliation.difference || 0)) < 0.01 ? "success" : "warning"}">
          <span class="summary-label">Saldo Real en Banco</span>
          <span class="summary-value">${formatCurrency(saldoBanco)}</span>
        </div>
        <div class="summary-item ${Math.abs(Number(reconciliation.difference || 0)) < 0.01 ? "success" : "warning"}">
          <span class="summary-label">Diferencia</span>
          <span class="summary-value">${formatCurrency(reconciliation.difference || 0)}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Cheques en Tránsito -->
  ${chequesEnTransito.length > 0 ? `
  <div class="section">
    <div class="section-title transit">Cheques Girados y No Cobrados (En Tránsito)</div>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Referencia</th>
          <th>Descripción</th>
          <th class="text-right">Monto</th>
        </tr>
      </thead>
      <tbody>
        ${chequesEnTransito.map((item) => `
          <tr>
            <td>${formatDate(item.transaction_date)}</td>
            <td>${item.reference_number || "-"}</td>
            <td>${item.description || "-"}</td>
            <td class="text-right amount">${formatCurrency(item.amount || 0)}</td>
          </tr>
        `).join("")}
        <tr class="total-row">
          <td colspan="3" class="text-right"><strong>Total Cheques en Tránsito:</strong></td>
          <td class="text-right amount">${formatCurrency(totalChequesTransito)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  ` : ""}

  <!-- Cruce Final -->
  <div class="cruce-final">
    <div class="cruce-title">VERIFICACIÓN DEL CRUCE FINAL</div>
    <div class="cruce-grid">
      <div class="cruce-item">
        <div class="cruce-label">Saldo en Libros</div>
        <div class="cruce-value">${formatCurrency(saldoEnLibros)}</div>
      </div>
      <div class="cruce-op">+</div>
      <div class="cruce-item">
        <div class="cruce-label">Cheques No Cobrados</div>
        <div class="cruce-value">${formatCurrency(totalChequesTransito)}</div>
      </div>
      <div class="cruce-op">=</div>
      <div class="cruce-item">
        <div class="cruce-label">Saldo Final en Banco</div>
        <div class="cruce-value">${formatCurrency(saldoBanco)}</div>
      </div>
    </div>
  </div>

  <!-- Detalle Cronológico de Transacciones -->
  <div class="section" style="margin-top: 25px;">
    <div class="section-title">Detalle Cronológico de Transacciones Conciliadas</div>
    ${(items || []).length > 0 ? `
    <table>
      <thead>
        <tr>
          <th style="width: 70px;">Fecha</th>
          <th style="width: 60px;">Tipo</th>
          <th>Referencia</th>
          <th>Descripción</th>
          <th class="text-right" style="width: 90px;">Ingreso</th>
          <th class="text-right" style="width: 90px;">Egreso</th>
        </tr>
      </thead>
      <tbody>
        ${(items || []).map((item) => `
          <tr>
            <td>${formatDate(item.transaction_date)}</td>
            <td>${item.transaction_type === "ingreso" ? "REC" : "EG"}</td>
            <td>${item.reference_number || "-"}</td>
            <td>${item.description || "-"}${item.check_id && !item.is_check_cashed ? " <em>(cheque no cobrado)</em>" : ""}</td>
            <td class="text-right amount positive">${item.transaction_type === "ingreso" ? formatCurrency(item.amount || 0) : ""}</td>
            <td class="text-right amount negative">${item.transaction_type === "egreso" && (!item.check_id || item.is_check_cashed) ? formatCurrency(item.amount || 0) : ""}</td>
          </tr>
        `).join("")}
        <tr class="total-row">
          <td colspan="4" class="text-right"><strong>TOTALES:</strong></td>
          <td class="text-right amount positive">${formatCurrency(totalIngresos)}</td>
          <td class="text-right amount negative">${formatCurrency(totalEgresosContabilizados)}</td>
        </tr>
      </tbody>
    </table>
    ` : `<div class="no-items">No hay transacciones registradas en esta conciliación</div>`}
  </div>

  <!-- Firmas -->
  <div class="signature-area">
    <div class="signature-box">
      <div class="signature-line">Elaborado por</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Revisado por</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Aprobado por</div>
    </div>
  </div>

  <div class="footer">
    <div>
      ${reconciliation.notes ? `<strong>Detalle:</strong> ${reconciliation.notes}` : ""}
    </div>
    <div>
      Generado el ${new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} | EDIFIKA
    </div>
  </div>
</body>
</html>
  `;

  // Generar PDF con Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    printBackground: true,
  });
  await browser.close();

  const filename = `conciliacion-${cutoffDate.replace(/\//g, "-")}.pdf`;

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}

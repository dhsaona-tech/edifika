import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { readFile } from "fs/promises";
import { join } from "path";
import { documentTypeLabels } from "@/lib/payables/schemas";

export const revalidate = 0;

type ParamsArg = { id: string } | Promise<{ id: string }>;

export async function GET(req: NextRequest, ctx: { params: ParamsArg }) {
  const resolved = await ctx.params;
  const payableId = resolved.id;
  const { searchParams } = new URL(req.url);
  const condominiumId = searchParams.get("condominiumId");
  if (!condominiumId) return NextResponse.json({ error: "Falta condominiumId" }, { status: 400 });

  const supabase = await createClient();

  // Obtener datos del payable
  const { data: payable, error } = await supabase
    .from("payable_orders")
    .select(`
      *,
      suppliers(name, fiscal_id, contact_person, email, phone, address),
      expense_items(name)
    `)
    .eq("id", payableId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (error || !payable) {
    return NextResponse.json({ error: "Cuenta por pagar no encontrada" }, { status: 404 });
  }

  // Obtener datos del condominio
  const { data: condo } = await supabase
    .from("condominiums")
    .select("name, logo_url, fiscal_id, address, phone")
    .eq("id", condominiumId)
    .maybeSingle();

  // Leer el logo de EDIFIKA como base64
  let edifikaLogoBase64 = null;
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
        // Continuar
      }
    }
  }

  const documentType = documentTypeLabels[payable.document_type] || "Documento";
  const supplier = payable.suppliers || {};
  const expenseItem = payable.expense_items?.name || "-";

  // Extraer método de pago previsto de las notas
  const plannedMethod = (payable.notes || "")
    .split("|")
    .map((s: string) => s.trim())
    .find((s: string) => s.toLowerCase().startsWith("pago previsto"))
    ?.replace(/pago previsto:/i, "")
    .trim() || null;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: "Inter", Arial, sans-serif; color: #0f172a; background: #fff; font-size: 11px; padding: 24px; }

        .draft-banner {
          background: #fef3c7;
          border: 2px dashed #d97706;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          margin-bottom: 20px;
        }
        .draft-banner h2 {
          color: #92400e;
          font-size: 16px;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .draft-banner p {
          color: #a16207;
          font-size: 10px;
          margin-top: 4px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
        }
        .header-left { }
        .logo { height: 50px; object-fit: contain; margin-bottom: 8px; }
        .condo-name { font-size: 14px; font-weight: 700; color: #0f172a; }
        .condo-info { font-size: 10px; color: #64748b; line-height: 1.5; margin-top: 4px; }

        .header-right { text-align: right; }
        .doc-type { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        .doc-number { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px; }

        .section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 16px;
        }
        .section-title {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 10px;
          letter-spacing: 0.5px;
        }

        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .field-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
        .field-value { font-size: 12px; color: #0f172a; font-weight: 500; }

        .amount-box {
          background: #0f172a;
          color: white;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          margin-top: 16px;
        }
        .amount-label { font-size: 10px; opacity: 0.8; text-transform: uppercase; }
        .amount-value { font-size: 24px; font-weight: 800; margin-top: 4px; }

        .description-box {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 16px;
        }

        .signature-section {
          margin-top: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }
        .signature-box {
          text-align: center;
        }
        .signature-line {
          border-top: 1px solid #0f172a;
          margin-top: 50px;
          padding-top: 8px;
        }
        .signature-label { font-size: 10px; color: #64748b; }

        .footer {
          margin-top: 30px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer-text { font-size: 9px; color: #94a3b8; }
        .edifika-logo { height: 30px; }
      </style>
    </head>
    <body>
      <div class="draft-banner">
        <h2>⚠️ Borrador - Pendiente de Pago</h2>
        <p>Este documento NO es un comprobante de pago. Es solo para autorización previa.</p>
      </div>

      <div class="header">
        <div class="header-left">
          ${condo?.logo_url ? `<img src="${condo.logo_url}" class="logo" />` : ""}
          <div class="condo-name">${condo?.name || "Condominio"}</div>
          <div class="condo-info">
            ${condo?.fiscal_id ? `RUC: ${condo.fiscal_id}<br>` : ""}
            ${condo?.address ? `${condo.address}<br>` : ""}
            ${condo?.phone ? `Tel: ${condo.phone}` : ""}
          </div>
        </div>
        <div class="header-right">
          <div class="doc-type">${documentType}</div>
          <div class="doc-number">${payable.invoice_number}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Proveedor</div>
        <div class="grid">
          <div>
            <div class="field-label">Nombre</div>
            <div class="field-value">${supplier.name || "-"}</div>
          </div>
          <div>
            <div class="field-label">RUC / ID</div>
            <div class="field-value">${supplier.fiscal_id || "-"}</div>
          </div>
          <div>
            <div class="field-label">Contacto</div>
            <div class="field-value">${supplier.contact_person || "-"}</div>
          </div>
          <div>
            <div class="field-label">Teléfono</div>
            <div class="field-value">${supplier.phone || "-"}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Detalle del gasto</div>
        <div class="grid">
          <div>
            <div class="field-label">Rubro</div>
            <div class="field-value">${expenseItem}</div>
          </div>
          <div>
            <div class="field-label">Fecha de emisión</div>
            <div class="field-value">${payable.issue_date}</div>
          </div>
          <div>
            <div class="field-label">Fecha de vencimiento</div>
            <div class="field-value">${payable.due_date}</div>
          </div>
          ${plannedMethod ? `
          <div>
            <div class="field-label">Forma de pago prevista</div>
            <div class="field-value" style="text-transform: capitalize;">${plannedMethod}</div>
          </div>
          ` : ""}
        </div>
      </div>

      ${payable.description ? `
      <div class="description-box">
        <div class="section-title">Descripción / Justificación</div>
        <div class="field-value">${payable.description}</div>
      </div>
      ` : ""}

      <div class="amount-box">
        <div class="amount-label">Monto total a pagar</div>
        <div class="amount-value">${formatCurrency(payable.total_amount)}</div>
      </div>

      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line">
            <div class="signature-label">Autorizado por</div>
          </div>
        </div>
        <div class="signature-box">
          <div class="signature-line">
            <div class="signature-label">Fecha de autorización</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <div class="footer-text">
          Generado el ${new Date().toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" })}<br>
          Este documento es un borrador y no tiene validez contable.
        </div>
        ${edifikaLogoBase64 ? `<img src="${edifikaLogoBase64}" class="edifika-logo" />` : '<div style="font-size: 12px; font-weight: 600; color: #1e3a8a;">EDIFIKA</div>'}
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
    printBackground: true,
  });
  await browser.close();

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="borrador-${payable.invoice_number}.pdf"`,
    },
  });
}

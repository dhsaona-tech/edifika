import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { readFile } from "fs/promises";
import { join } from "path";
import { documentTypeLabels } from "@/lib/payables/schemas";
import PayableDraftPdfTemplate from "@/app/app/[id]/payables/components/PayableDraftPdfTemplate";

export const revalidate = 0;

type ParamsArg = { id: string } | Promise<{ id: string }>;

/* ── Helper: leer logo EDIFIKA como base64 data URI ── */
async function loadEdifikaLogo(): Promise<string | null> {
  const formats = ["png", "jpg", "svg", "webp"];
  for (const format of formats) {
    try {
      const logoPath = join(process.cwd(), "public", "logos", `edifika-logo.${format}`);
      const logoBuffer = await readFile(logoPath);
      const mimeType = format === "svg" ? "image/svg+xml" : `image/${format}`;
      return `data:${mimeType};base64,${logoBuffer.toString("base64")}`;
    } catch {
      // try next format
    }
  }
  return null;
}

export async function GET(req: NextRequest, ctx: { params: ParamsArg }) {
  const resolved = await ctx.params;
  const payableId = resolved.id;
  const { searchParams } = new URL(req.url);
  const condominiumId = searchParams.get("condominiumId");
  if (!condominiumId) return NextResponse.json({ error: "Falta condominiumId" }, { status: 400 });

  // Verificar autenticación
  const authSupabase = await createClient();
  const { data: { user }, error: authError } = await authSupabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

  const edifikaLogoUrl = await loadEdifikaLogo();

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

  // Generar PDF con @react-pdf/renderer (compatible con Vercel serverless)
  const element = React.createElement(PayableDraftPdfTemplate, {
    condo: {
      name: condo?.name || "Condominio",
      logoUrl: condo?.logo_url,
      fiscalId: condo?.fiscal_id,
      address: condo?.address,
      phone: condo?.phone,
    },
    edifikaLogoUrl,
    documentType,
    supplier: {
      name: supplier.name || "-",
      fiscalId: supplier.fiscal_id,
      contactPerson: supplier.contact_person,
      phone: supplier.phone,
    },
    payable: {
      invoiceNumber: payable.invoice_number,
      issueDate: payable.issue_date,
      dueDate: payable.due_date,
      expenseItem,
      description: payable.description,
      totalAmount: formatCurrency(payable.total_amount),
      plannedMethod,
    },
  });
  // @ts-expect-error — @react-pdf types expect DocumentProps but component wraps Document internally
  const pdfBuffer = await renderToBuffer(element);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="borrador-${payable.invoice_number}.pdf"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPayableDetail } from "@/app/app/[id]/payables/actions";
import { formatCurrency } from "@/lib/utils";
import { readFile } from "fs/promises";
import { join } from "path";
import PayableOrderPdfTemplate from "@/app/app/[id]/payables/components/PayableOrderPdfTemplate";

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
  const supabaseAdmin = createAdminClient();
  const payable = await getPayableDetail(condominiumId, payableId);
  if (!payable) return NextResponse.json({ error: "OP no encontrada" }, { status: 404 });

  const { data: condo } = await supabase
    .from("condominiums")
    .select("name, address, logo_url, ruc")
    .eq("id", condominiumId)
    .maybeSingle();

  const plannedMethod =
    (payable.notes || "")
      .split("|")
      .map((s: string) => s.trim())
      .find((s: string) => s.toLowerCase().startsWith("pago previsto")) || null;
  const plannedRef =
    (payable.notes || "")
      .split("|")
      .map((s: string) => s.trim())
      .find((s: string) => s.toLowerCase().startsWith("ref:")) || null;
  const folio = payable.folio_op ? payable.folio_op.toString().padStart(4, "0") : undefined;

  const edifikaLogoUrl = await loadEdifikaLogo();

  // Generar PDF con @react-pdf/renderer (compatible con Vercel serverless)
  const element = React.createElement(PayableOrderPdfTemplate, {
      condo: {
        name: condo?.name || "Condominio",
        logoUrl: condo?.logo_url,
        address: condo?.address,
        ruc: condo?.ruc,
      },
      edifikaLogoUrl,
      payable: {
        folio,
        supplier: payable.supplier?.name || "Proveedor",
        expenseItem: payable.expense_item?.name || "Rubro",
        issueDate: payable.issue_date || "-",
        dueDate: payable.due_date || "-",
        invoice: payable.invoice_number,
        total: formatCurrency(payable.total_amount || 0),
        detail: payable.description || payable.notes || "",
        plannedMethod: plannedMethod ? plannedMethod.replace(/pago previsto:\s*/i, "") : null,
        plannedReference: plannedRef ? plannedRef.replace(/ref:\s*/i, "") : null,
      },
    });
  // @ts-expect-error — @react-pdf types expect DocumentProps but component wraps Document internally
  const pdfBuffer = await renderToBuffer(element);

  // Subir PDF a Storage
  const storagePath = `payables/orders/${payableId}.pdf`;
  const bucketUsed = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_ATTACHMENTS || "pdfs";

  await supabaseAdmin.storage.createBucket(bucketUsed, { public: true }).catch(() => {});

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucketUsed)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true as any,
    });

  if (!uploadError) {
    const { data: signedData } = await supabaseAdmin.storage
      .from(bucketUsed)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 30); // 30 días
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucketUsed)
      .getPublicUrl(storagePath);
    const publicUrl = signedData?.signedUrl || publicUrlData?.publicUrl || null;

    if (publicUrl) {
      await supabase
        .from("payable_orders")
        .update({ op_pdf_url: publicUrl })
        .eq("id", payableId)
        .eq("condominium_id", condominiumId);
    }
  } else {
    console.error("Error subiendo PDF de orden de pago", uploadError);
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="orden-pago-${folio}.pdf"`,
    },
  });
}

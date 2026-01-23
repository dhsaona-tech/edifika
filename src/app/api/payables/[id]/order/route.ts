import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPayableDetail } from "@/app/app/[id]/payables/actions";
import { formatCurrency } from "@/lib/utils";

export const revalidate = 0;

type ParamsArg = { id: string } | Promise<{ id: string }>;

export async function GET(req: NextRequest, ctx: { params: ParamsArg }) {
  const resolved = await ctx.params;
  const payableId = resolved.id;
  const { searchParams } = new URL(req.url);
  const condominiumId = searchParams.get("condominiumId");
  if (!condominiumId) return NextResponse.json({ error: "Falta condominiumId" }, { status: 400 });

  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();
  const payable = await getPayableDetail(condominiumId, payableId);
  if (!payable) return NextResponse.json({ error: "OP no encontrada" }, { status: 404 });

  const { data: condo } = await supabase
    .from("condominiums")
    .select("name, address, logo_url, ruc")
    .eq("id", condominiumId)
    .maybeSingle();

  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const Template = (await import("@/app/app/[id]/payables/components/PayableOrderTemplate")).default;

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
  const html = renderToStaticMarkup(
    React.createElement(Template, {
      condo: { name: condo?.name || "Condominio", logoUrl: condo?.logo_url, address: condo?.address, ruc: condo?.ruc },
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
    })
  );

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: { top: "18mm", right: "12mm", bottom: "18mm", left: "12mm" },
    printBackground: true,
  });
  await browser.close();

  const storagePath = `payables/orders/${payableId}.pdf`;
  const bucketUsed = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_ATTACHMENTS || "pdfs";
  const pdfArrayBuffer: ArrayBuffer =
    pdfBuffer instanceof ArrayBuffer
      ? pdfBuffer
      : (pdfBuffer as Uint8Array).buffer.slice(
          (pdfBuffer as Uint8Array).byteOffset,
          (pdfBuffer as Uint8Array).byteOffset + (pdfBuffer as Uint8Array).byteLength
        ) as ArrayBuffer;

  await supabaseAdmin.storage.createBucket(bucketUsed, { public: true }).catch(() => {
    // ignore if exists
  });

  const tryUpload = async () => {
    const attempt = await supabaseAdmin.storage.from(bucketUsed).upload(storagePath, pdfArrayBuffer, {
      contentType: "application/pdf",
      upsert: true as any,
    });
    if (attempt.error && attempt.error.message?.toLowerCase().includes("bucket not found")) {
      const createRes = await supabaseAdmin.storage.createBucket(bucketUsed, { public: true });
      if (createRes.error && !String(createRes.error.message || "").toLowerCase().includes("already exists")) {
        return attempt;
      }
      return await supabaseAdmin.storage.from(bucketUsed).upload(storagePath, pdfArrayBuffer, {
        contentType: "application/pdf",
        upsert: true as any,
      });
    }
    return attempt;
  };

  const { error: uploadError } = await tryUpload();

  if (!uploadError) {
    const { data: publicUrlData } = supabaseAdmin.storage.from(bucketUsed).getPublicUrl(storagePath);
    const { data: signedData } = await supabaseAdmin.storage.from(bucketUsed).createSignedUrl(storagePath, 60 * 60 * 24 * 365);
    const fallbackPublic =
      process.env.NEXT_PUBLIC_SUPABASE_URL && storagePath
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketUsed}/${storagePath}`
        : null;
    const publicUrl = signedData?.signedUrl || publicUrlData?.publicUrl || fallbackPublic || null;

    if (publicUrl) {
      await supabase.from("payable_orders").update({ op_pdf_url: publicUrl }).eq("id", payableId).eq("condominium_id", condominiumId);
    }
  } else {
    console.error("Error subiendo PDF de orden de pago", uploadError);
  }

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="orden-pago-${folio}.pdf"`,
    },
  });
}

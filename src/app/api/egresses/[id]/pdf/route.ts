import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { readFile } from "fs/promises";
import { join } from "path";

export const revalidate = 0;

type ParamsArg = { id: string } | Promise<{ id: string }>;

export async function GET(req: NextRequest, ctx: { params: ParamsArg }) {
  const resolved = await ctx.params;
  const egressId = resolved.id;
  const { searchParams } = new URL(req.url);
  const condominiumId = searchParams.get("condominiumId");
  if (!condominiumId) return NextResponse.json({ error: "Falta condominiumId" }, { status: 400 });

  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();
  const { data: egress, error } = await supabase
    .from("egresses")
    .select(
      `
      *,
      suppliers(name, fiscal_id, contact_person, email, phone, address),
      financial_accounts(bank_name, account_number)
    `
    )
    .eq("id", egressId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();
  if (error || !egress) return NextResponse.json({ error: "Egreso no encontrado" }, { status: 404 });

  const { data: allocations } = await supabase
    .from("egress_allocations")
    .select(
      `
      amount_allocated,
      payable:payable_orders(
        invoice_number,
        issue_date,
        description,
        expense_item:expense_items(name)
      )
    `
    )
    .eq("egress_id", egressId);

  const { data: condo } = await supabase
    .from("condominiums")
    .select("name, logo_url, fiscal_id, address, phone")
    .eq("id", condominiumId)
    .maybeSingle();

  // Debug: ver qué datos tenemos
  console.log("Datos del condominio (egreso):", {
    name: condo?.name,
    fiscal_id: condo?.fiscal_id,
    address: condo?.address,
    phone: condo?.phone,
  });

  // Leer el logo de EDIFIKA como base64
  let edifikaLogoBase64 = null;
  try {
    const logoPath = join(process.cwd(), "public", "logos", "edifika-logo.png");
    const logoBuffer = await readFile(logoPath);
    edifikaLogoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch (error) {
    console.warn("No se pudo cargar el logo de EDIFIKA:", error);
    // Intentar otros formatos
    const formats = ["jpg", "svg", "webp"];
    for (const format of formats) {
      try {
        const logoPath = join(process.cwd(), "public", "logos", `edifika-logo.${format}`);
        const logoBuffer = await readFile(logoPath);
        const mimeType = format === "svg" ? "image/svg+xml" : `image/${format}`;
        edifikaLogoBase64 = `data:${mimeType};base64,${logoBuffer.toString("base64")}`;
        break;
      } catch (e) {
        // Continuar con el siguiente formato
      }
    }
  }

  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const Template = (await import("@/app/app/[id]/payables/components/EgressPdfTemplate")).default;

  const folio = egress.folio_eg ? egress.folio_eg.toString().padStart(4, "0") : "--";
  const html = renderToStaticMarkup(
    React.createElement(Template, {
      condo: {
        name: condo?.name || "Condominio",
        logoUrl: condo?.logo_url,
        address: condo?.address || null,
        ruc: condo?.fiscal_id || null, // Mapear fiscal_id a ruc
        phone: condo?.phone || null,
      },
      edifikaLogoUrl: edifikaLogoBase64, // Pasar el logo como base64
      supplier: {
        name: egress.suppliers?.name || "Proveedor",
        ruc: egress.suppliers?.fiscal_id || "",
        contact: egress.suppliers?.contact_person || "",
        email: egress.suppliers?.email || "",
        phone: egress.suppliers?.phone || "",
        address: egress.suppliers?.address || "",
      },
      egress: {
        folio,
        account: egress.financial_accounts
          ? `${egress.financial_accounts.bank_name || "Cuenta"} ${egress.financial_accounts.account_number || ""}`
          : "Cuenta",
        paymentDate: egress.payment_date || "-",
        method: egress.payment_method || "-",
        reference: egress.reference_number || "",
        total: formatCurrency(egress.total_amount || 0),
        notes: egress.notes || "",
      },
      allocations:
        (allocations || []).map((a: any) => ({
          invoice: a.payable?.invoice_number || "-",
          issueDate: a.payable?.issue_date,
          expenseItem: a.payable?.expense_item?.name || "-",
          description: a.payable?.description || "-",
          amount: formatCurrency(a.amount_allocated || 0),
        })) || [],
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

  const storagePath = `egresses/pdf/${egressId}.pdf`;
  const bucketUsed = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_ATTACHMENTS || "pdfs";
  const pdfArrayBuffer: ArrayBuffer =
    pdfBuffer instanceof ArrayBuffer
      ? pdfBuffer
      : (pdfBuffer as Uint8Array).buffer.slice(
          (pdfBuffer as Uint8Array).byteOffset,
          (pdfBuffer as Uint8Array).byteOffset + (pdfBuffer as Uint8Array).byteLength
        ) as ArrayBuffer;

  await supabaseAdmin.storage.createBucket(bucketUsed, { public: true }).catch(() => {
    // ignore if already exists
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
      await supabase.from("egresses").update({ pdf_url: publicUrl }).eq("id", egressId).eq("condominium_id", condominiumId);
    }
  } else {
    console.error("Error subiendo PDF de egreso", uploadError);
  }

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="egreso-${folio}.pdf"`,
    },
  });
}

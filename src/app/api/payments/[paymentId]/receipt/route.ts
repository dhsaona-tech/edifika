import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { readFile } from "fs/promises";
import { join } from "path";
// QR/Barcode desactivados por ahora

async function getPaymentDetail(condominiumId: string, paymentId: string) {
  const supabase = await createClient();

  const { data: payment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (error || !payment) {
    console.error("Error leyendo payment", error);
    return null;
  }

  const [unitRes, payerRes, accountRes, expenseRes, allocationsRes, contactRes] = await Promise.all([
    payment.unit_id
      ? supabase.from("units").select("id, full_identifier, identifier").eq("id", payment.unit_id).maybeSingle()
      : Promise.resolve({ data: null }),
    payment.payer_profile_id
      ? supabase
          .from("profiles")
          .select("id, full_name, national_id, email, phone, address")
          .eq("id", payment.payer_profile_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    payment.financial_account_id
      ? supabase
          .from("financial_accounts")
          .select("id, bank_name, account_number")
          .eq("id", payment.financial_account_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    payment.expense_item_id
      ? supabase.from("expense_items").select("id, name").eq("id", payment.expense_item_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("payment_allocations")
      .select(
        `
        id,
        amount_allocated,
        charge:charges(
          id,
          unit_id,
          period,
          description,
          due_date,
          total_amount,
          balance,
          expense_item:expense_items(name)
        )
      `
      )
      .eq("payment_id", paymentId),
    payment.unit_id
      ? supabase
          .from("unit_contacts")
          .select("profiles(id, full_name, national_id, email, phone, address)")
          .eq("unit_id", payment.unit_id)
          .eq("is_primary_contact", true)
          .is("end_date", null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const payer =
    payerRes.data ||
    (contactRes.data as any)?.profiles ||
    null;

  return {
    ...payment,
    unit: unitRes.data || null,
    payer,
    financial_account: accountRes.data || null,
    expense_item: expenseRes.data || null,
    allocations: (allocationsRes.data || []).map((a: any) => ({
      ...a,
      charge: Array.isArray(a.charge) ? a.charge[0] : a.charge,
    })),
    attachment_url: (payment as any).attachment_url ?? null,
  };
}

export const revalidate = 0;

type ParamsArg = { paymentId: string } | Promise<{ paymentId: string }>;

export async function GET(req: NextRequest, ctx: { params: ParamsArg }) {
  const resolvedParams = await ctx.params;
  const paymentId = resolvedParams.paymentId;
  const { searchParams } = new URL(req.url);
  const condominiumId = searchParams.get("condominiumId");

  if (!condominiumId) {
    return NextResponse.json({ error: "Falta condominiumId" }, { status: 400 });
  }

  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();
  const payment = await getPaymentDetail(condominiumId, paymentId);
  if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

  // Fallback para datos de contacto desde unit_contacts (titular recibo)
  const unitId = (payment as any)?.unit_id || payment.unit?.id || null;
  const { data: unitContact } = unitId
    ? await supabase
        .from("unit_contacts")
        .select(
          `
          profiles(
            full_name,
            national_id,
            email,
            phone,
            address
          )
        `
        )
        .eq("unit_id", unitId)
        .eq("is_primary_contact", true)
        .is("end_date", null)
        .maybeSingle()
    : { data: null };

  const { data: condo } = await supabase
    .from("condominiums")
    .select("name, logo_url, fiscal_id, address, phone")
    .eq("id", condominiumId)
    .maybeSingle();

  // Debug: ver qué datos tenemos
  console.log("Datos del condominio:", {
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

  const receiptNumber = payment.folio_rec ? payment.folio_rec.toString().padStart(4, "0") : "--";
  const paymentUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/app/${condominiumId}/payments/${paymentId}`;
  const qrDataUrl = undefined;

  const allocations =
    (payment.allocations || []).map((a: any) => {
      const rawDetail = a.charge?.description || a.charge?.expense_item?.name || "-";
      // Si viene "X - X" dejamos solo una vez
      const detail = (() => {
        const parts = rawDetail.split(" - ").map((p: string) => p.trim()).filter(Boolean);
        if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) return parts[0];
        return rawDetail;
      })();
      const unidadLabel = payment.unit?.full_identifier || payment.unit?.identifier || "";
      const unidad = unidadLabel.toLowerCase().startsWith("departamento")
        ? `Departamento ${unidadLabel.split(" ").slice(1).join(" ")}`
        : unidadLabel;
      return {
        unidad,
        concepto: a.charge?.expense_item?.name || a.charge?.description || "-",
        periodo: a.charge?.period || "-",
        detalle: detail,
        asignado: formatCurrency(a.amount_allocated || 0),
        saldo: formatCurrency(a.charge?.balance || 0),
      };
    }) || [];

  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const Receipt = (await import("@/app/app/[id]/payments/components/ReceiptTemplate")).default;

  const html = renderToStaticMarkup(
    React.createElement(Receipt, {
      condo: {
        name: condo?.name || "Condominio",
        logoUrl: condo?.logo_url,
        ruc: condo?.fiscal_id || null,
        address: condo?.address || null,
        phone: condo?.phone || null,
      },
      edifikaLogoUrl: edifikaLogoBase64,
      receiptNumber,
      qrDataUrl: undefined,
      isVoided: payment.status === "cancelado",
      payment: {
        paymentDate: payment.payment_date || "-",
        method: payment.payment_method || "-",
        reference: payment.reference_number || "-",
        account: payment.financial_account?.bank_name || "-",
        accountNumber: payment.financial_account?.account_number || "-",
        total: formatCurrency(payment.total_amount || 0),
        subtotal: formatCurrency(payment.allocated_amount || payment.total_amount || 0),
        notes: payment.notes,
      },
      payer: {
        name: payment.payer?.full_name || (unitContact as any)?.profiles?.full_name || "-",
        id: payment.payer?.national_id || (unitContact as any)?.profiles?.national_id || "",
        phone: payment.payer?.phone || (unitContact as any)?.profiles?.phone || "",
        email: payment.payer?.email || (unitContact as any)?.profiles?.email || "",
        unit: payment.unit?.full_identifier || payment.unit?.identifier || "",
        address: payment.payer?.address || (unitContact as any)?.profiles?.address || "",
      },
      allocations,
      createdLabel: receiptNumber ? `Folio ${receiptNumber}` : "",
    })
  );

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);
  await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60000 });
  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: { top: "20mm", right: "12mm", bottom: "20mm", left: "12mm" },
    printBackground: true,
  });
  await browser.close();

  const storagePath = `receipts/${paymentId}.pdf`;
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
      await supabase
        .from("payments")
        .update({ pdf_url: publicUrl })
        .eq("id", paymentId)
        .eq("condominium_id", condominiumId);
    }
  } else {
    console.error("Error subiendo PDF de recibo", uploadError);
  }

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${receiptNumber}.pdf"`,
    },
  });
}

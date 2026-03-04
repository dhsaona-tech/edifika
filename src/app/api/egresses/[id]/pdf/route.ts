import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { readFile } from "fs/promises";
import { join } from "path";
import EgressPdfTemplate from "@/app/app/[id]/payables/components/EgressPdfTemplate";

export const revalidate = 0;

type ParamsArg = { id: string } | Promise<{ id: string }>;

/* ── Helper: fecha en español ── */
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

export async function GET(req: NextRequest, ctx: { params: ParamsArg }) {
  const resolved = await ctx.params;
  const egressId = resolved.id;
  const { searchParams } = new URL(req.url);
  const condominiumId = searchParams.get("condominiumId");
  if (!condominiumId) return NextResponse.json({ error: "Falta condominiumId" }, { status: 400 });

  const supabase = await createClient();

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();

  // ──────────── 1. Leer egreso con SELECT * (incluye snapshot columns) ────────────
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

  // ──────────── 2. Queries paralelas ────────────
  const [allocationsRes, condoRes, auditRes] = await Promise.all([
    supabase
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
      .eq("egress_id", egressId),
    supabase
      .from("condominiums")
      .select("name, logo_url, fiscal_id, address, phone")
      .eq("id", condominiumId)
      .maybeSingle(),
    // Buscar quién registró el egreso en audit_logs (admin client = sin RLS)
    supabaseAdmin
      .from("audit_logs")
      .select("performed_by")
      .eq("table_name", "egresses")
      .eq("record_id", egressId)
      .eq("action", "CREATE")
      .order("performed_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const condo = condoRes.data;

  // ──────────── 3. Resolver nombre del creador (audit) ────────────
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

  // ──────────── 4. Resolver supplier con snapshot + fallback ────────────
  let supplierData = {
    name: egress.supplier_snapshot_name || egress.suppliers?.name || "Proveedor",
    ruc: egress.supplier_snapshot_fiscal_id || egress.suppliers?.fiscal_id || "",
    contact: egress.suppliers?.contact_person || "",
    email: egress.supplier_snapshot_email || egress.suppliers?.email || "",
    phone: egress.supplier_snapshot_phone || egress.suppliers?.phone || "",
    address: egress.supplier_snapshot_address || egress.suppliers?.address || "",
  };

  // ──────────── 5. Logos como base64 ────────────
  // Logo EDIFIKA: prioridad al archivo con fondo blanco, fallback al original
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

  // Logo del condominio: si es URL de storage, descargarlo como base64
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
      // Fallback: usará texto del nombre
    }
  }

  // ──────────── 6. Preparar datos ────────────
  const folio = egress.folio_eg ? egress.folio_eg.toString().padStart(4, "0") : "--";
  const isVoided = egress.status === "anulado" || egress.status === "cancelado";
  const paymentDateFormatted = egress.payment_date ? formatDateEs(egress.payment_date) : "-";

  // Formatear fecha de factura en español
  const formatIssueDateEs = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "\u2014";
    try {
      const d = new Date(dateStr + "T12:00:00");
      if (isNaN(d.getTime())) return dateStr;
      const dd = d.getDate().toString().padStart(2, "0");
      const mm = (d.getMonth() + 1).toString().padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return dateStr;
    }
  };

  const allocations = (allocationsRes.data || []).map((a: any) => {
    const payable = Array.isArray(a.payable) ? a.payable[0] : a.payable;
    return {
      invoice: payable?.invoice_number || "-",
      issueDate: formatIssueDateEs(payable?.issue_date),
      expenseItem: payable?.expense_item?.name || "-",
      description: payable?.description || "-",
      amount: formatCurrency(a.amount_allocated || 0),
    };
  });

  // ──────────── 7. Render PDF ────────────
  const egressElement = React.createElement(EgressPdfTemplate, {
    condo: {
      name: condo?.name || "Condominio",
      logoUrl: condoLogoBase64,
      ruc: condo?.fiscal_id || null,
      address: condo?.address || null,
      phone: condo?.phone || null,
    },
    edifikaLogoUrl: edifikaLogoBase64,
    isVoided,
    cancellationReason: egress.cancellation_reason || null,
    creatorName,
    supplier: supplierData,
    egress: {
      folio,
      paymentDate: egress.payment_date || "-",
      paymentDateFormatted,
      method: egress.payment_method || "-",
      reference: egress.reference_number || "",
      account: egress.financial_accounts?.bank_name || "Cuenta",
      accountNumber: egress.financial_accounts?.account_number || "",
      total: formatCurrency(egress.total_amount || 0),
      notes: egress.notes || "",
    },
    allocations,
  });
  // @ts-expect-error — @react-pdf types expect DocumentProps but component wraps Document internally
  const pdfBuffer = await renderToBuffer(egressElement);

  // ──────────── 8. Upload PDF a Supabase Storage ────────────
  const storagePath = `egresses/pdf/${egressId}.pdf`;
  const bucketUsed = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_ATTACHMENTS || "pdfs";

  await supabaseAdmin.storage.createBucket(bucketUsed, { public: true }).catch(() => {});

  const tryUpload = async () => {
    const attempt = await supabaseAdmin.storage.from(bucketUsed).upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true as any,
    });
    if (attempt.error && attempt.error.message?.toLowerCase().includes("bucket not found")) {
      const createRes = await supabaseAdmin.storage.createBucket(bucketUsed, { public: true });
      if (createRes.error && !String(createRes.error.message || "").toLowerCase().includes("already exists")) {
        return attempt;
      }
      return await supabaseAdmin.storage.from(bucketUsed).upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true as any,
      });
    }
    return attempt;
  };

  const { error: uploadError } = await tryUpload();

  if (!uploadError) {
    const { data: publicUrlData } = supabaseAdmin.storage.from(bucketUsed).getPublicUrl(storagePath);
    const { data: signedData } = await supabaseAdmin.storage
      .from(bucketUsed)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
    const fallbackPublic =
      process.env.NEXT_PUBLIC_SUPABASE_URL && storagePath
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketUsed}/${storagePath}`
        : null;
    const publicUrl = signedData?.signedUrl || publicUrlData?.publicUrl || fallbackPublic || null;

    if (publicUrl) {
      await supabase
        .from("egresses")
        .update({ pdf_url: publicUrl })
        .eq("id", egressId)
        .eq("condominium_id", condominiumId);
    }
  } else {
    console.error("Error subiendo PDF de egreso", uploadError);
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="egreso-${folio}.pdf"`,
    },
  });
}

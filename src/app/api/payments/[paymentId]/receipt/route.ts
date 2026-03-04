import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { readFile } from "fs/promises";
import { join } from "path";
import ReceiptTemplate from "@/app/app/[id]/payments/components/ReceiptTemplate";

export const revalidate = 0;

type ParamsArg = { paymentId: string } | Promise<{ paymentId: string }>;

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
  const resolvedParams = await ctx.params;
  const paymentId = resolvedParams.paymentId;
  const { searchParams } = new URL(req.url);
  const condominiumId = searchParams.get("condominiumId");

  if (!condominiumId) {
    return NextResponse.json({ error: "Falta condominiumId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();

  // ──────────── 1. Leer payment con SELECT * (incluye snapshot columns) ────────────
  const { data: payment, error: payError } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (payError || !payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  // ──────────── 2. Queries paralelas ────────────
  const [unitRes, accountRes, allocationsRes, condoRes, auditRes] = await Promise.all([
    payment.unit_id
      ? supabase.from("units").select("id, full_identifier, identifier").eq("id", payment.unit_id).maybeSingle()
      : Promise.resolve({ data: null }),
    payment.financial_account_id
      ? supabase
          .from("financial_accounts")
          .select("id, bank_name, account_number")
          .eq("id", payment.financial_account_id)
          .maybeSingle()
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
    supabase
      .from("condominiums")
      .select("name, logo_url, fiscal_id, address, phone")
      .eq("id", condominiumId)
      .maybeSingle(),
    // Buscar quién registró el pago en audit_logs (admin client = sin RLS)
    supabaseAdmin
      .from("audit_logs")
      .select("performed_by")
      .eq("table_name", "payments")
      .eq("record_id", paymentId)
      .eq("action", "CREATE")
      .order("performed_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const unit = unitRes.data;
  const account = accountRes.data;
  const condo = condoRes.data;

  // ──────────── 3. Resolver nombre del creador (audit) ────────────
  let creatorName: string | null = null;
  const auditRow = auditRes.data as { performed_by: string } | null;
  if (auditRow?.performed_by) {
    // Usar admin client para evitar restricciones RLS en profiles
    const { data: creatorProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", auditRow.performed_by)
      .maybeSingle();
    creatorName = (creatorProfile as { full_name: string } | null)?.full_name || null;
  }

  // ──────────── 4. Resolver payer con snapshot + fallback ────────────
  let payerData = {
    name: payment.billing_name || "-",
    national_id: payment.billing_national_id || null,
    email: payment.billing_email || null,
    phone: payment.billing_phone || null,
    address: payment.billing_address || null,
  };

  // Fallback para registros viejos sin snapshot
  if (!payment.billing_name) {
    if (payment.payer_profile_id) {
      const { data: payerProfile } = await supabase
        .from("profiles")
        .select("full_name, national_id, email, phone, address")
        .eq("id", payment.payer_profile_id)
        .maybeSingle();
      if (payerProfile?.full_name) {
        payerData = {
          name: payerProfile.full_name,
          national_id: payerProfile.national_id || null,
          email: payerProfile.email || null,
          phone: payerProfile.phone || null,
          address: payerProfile.address || null,
        };
      }
    }
    if (payerData.name === "-" && payment.unit_id) {
      const { data: contact } = await supabase
        .from("unit_contacts")
        .select("profiles(full_name, national_id, email, phone, address)")
        .eq("unit_id", payment.unit_id)
        .eq("is_primary_contact", true)
        .is("end_date", null)
        .maybeSingle();
      const profile = Array.isArray((contact as any)?.profiles)
        ? (contact as any).profiles[0]
        : (contact as any)?.profiles;
      if (profile?.full_name) {
        payerData = {
          name: profile.full_name,
          national_id: profile.national_id || null,
          email: profile.email || null,
          phone: profile.phone || null,
          address: profile.address || null,
        };
      }
    }
  }

  // ──────────── 4b. Calcular saldo a favor y saldo pendiente ────────────
  const totalAmount = Number(payment.total_amount || 0);
  const allocatedAmount = Number(payment.allocated_amount || 0);
  const excessCredit = totalAmount - allocatedAmount;

  // Saldo pendiente de la unidad (solo si tiene unit_id)
  let unitPendingBalance = 0;
  if (payment.unit_id) {
    const { data: pendingCharges } = await supabase
      .from("charges")
      .select("balance")
      .eq("unit_id", payment.unit_id)
      .eq("condominium_id", condominiumId)
      .eq("status", "pendiente");
    if (pendingCharges) {
      unitPendingBalance = pendingCharges.reduce((sum, c) => sum + Number(c.balance || 0), 0);
    }
  }

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

  // ──────────── 6. Preparar allocations ────────────
  const receiptNumber = payment.folio_rec ? payment.folio_rec.toString().padStart(4, "0") : "--";

  const allocations = (allocationsRes.data || []).map((a: any) => {
    const charge = Array.isArray(a.charge) ? a.charge[0] : a.charge;
    const rawDetail = charge?.description || charge?.expense_item?.name || "-";
    const detail = (() => {
      const parts = rawDetail
        .split(" - ")
        .map((p: string) => p.trim())
        .filter(Boolean);
      if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) return parts[0];
      return rawDetail;
    })();
    // Formatear period como "Marzo 2026" en vez de "2026-03-01"
    const rawPeriod = charge?.period || "";
    const periodLabel = (() => {
      if (!rawPeriod) return "";
      const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
      ];
      try {
        const d = new Date(rawPeriod + "T12:00:00");
        if (isNaN(d.getTime())) return rawPeriod;
        return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      } catch {
        return rawPeriod;
      }
    })();
    // Solo agregar periodo si el detalle no lo contiene ya
    const alreadyHasPeriod = periodLabel && detail.toLowerCase().includes(periodLabel.toLowerCase());
    const fullDetail = periodLabel && !alreadyHasPeriod ? `${detail} ${periodLabel}` : detail;

    const unidadLabel = unit?.full_identifier || unit?.identifier || "";
    const unidad = unidadLabel.toLowerCase().startsWith("departamento")
      ? `Dpto. ${unidadLabel.split(" ").slice(1).join(" ")}`
      : unidadLabel;

    return {
      unidad,
      rubro: charge?.expense_item?.name || "-",
      detalle: fullDetail,
      valor: formatCurrency(charge?.total_amount || 0),
      descuento: formatCurrency(0),
      pago: formatCurrency(a.amount_allocated || 0),
    };
  });

  // ──────────── 7. Render PDF ────────────
  const paymentDateFormatted = payment.payment_date ? formatDateEs(payment.payment_date) : "-";

  const receiptElement = React.createElement(ReceiptTemplate, {
    condo: {
      name: condo?.name || "Condominio",
      logoUrl: condoLogoBase64,
      ruc: condo?.fiscal_id || null,
      address: condo?.address || null,
      phone: condo?.phone || null,
    },
    edifikaLogoUrl: edifikaLogoBase64,
    receiptNumber,
    isVoided: payment.status === "cancelado",
    cancellationReason: (payment as any).cancellation_reason || null,
    creatorName,
    payment: {
      paymentDate: payment.payment_date || "-",
      paymentDateFormatted,
      method: payment.payment_method || "-",
      reference: payment.reference_number || "-",
      account: account?.bank_name || "-",
      accountNumber: account?.account_number || "-",
      total: formatCurrency(totalAmount),
      subtotal: formatCurrency(allocatedAmount || totalAmount),
      creditGenerated: excessCredit > 0.01 ? formatCurrency(excessCredit) : null,
      notes: payment.notes,
    },
    payer: {
      name: payerData.name,
      id: payerData.national_id || "",
      phone: payerData.phone || "",
      email: payerData.email || "",
      unit: unit?.full_identifier || unit?.identifier || "",
      address: payerData.address || "",
    },
    allocations,
    unitPendingBalance: unitPendingBalance > 0.01 ? formatCurrency(unitPendingBalance) : null,
  });
  // @ts-expect-error — @react-pdf types expect DocumentProps but component wraps Document internally
  const pdfBuffer = await renderToBuffer(receiptElement);

  // ──────────── 8. Upload PDF a Supabase Storage ────────────
  const storagePath = `receipts/${paymentId}.pdf`;
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
        .from("payments")
        .update({ pdf_url: publicUrl })
        .eq("id", paymentId)
        .eq("condominium_id", condominiumId);
    }
  } else {
    console.error("Error subiendo PDF de recibo", uploadError);
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${receiptNumber}.pdf"`,
    },
  });
}

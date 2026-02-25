import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPaymentReceiptEmail } from "@/lib/email/sendReceiptEmail";
import { formatCurrency } from "@/lib/utils";

type ParamsArg = { paymentId: string } | Promise<{ paymentId: string }>;

/**
 * POST /api/payments/[paymentId]/send-receipt
 *
 * Envía el comprobante de pago por email al residente.
 * Body: { condominiumId: string }
 *
 * Este endpoint es llamado de forma async (fire-and-forget) desde el frontend
 * después de registrar un pago exitosamente. No bloquea el flujo principal.
 *
 * Requiere:
 * - Que el pago exista y tenga pdf_url (ya generado por /receipt)
 * - Que el residente tenga email registrado
 * - RESEND_API_KEY configurada en variables de entorno
 */
export async function POST(req: NextRequest, ctx: { params: ParamsArg }) {
  const resolvedParams = await ctx.params;
  const paymentId = resolvedParams.paymentId;

  let body: { condominiumId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { condominiumId } = body;
  if (!condominiumId) {
    return NextResponse.json({ error: "Falta condominiumId" }, { status: 400 });
  }

  // Verificar que RESEND_API_KEY existe antes de hacer cualquier query
  if (!process.env.RESEND_API_KEY) {
    console.warn("[EDIFIKA Email] RESEND_API_KEY no configurada. Email no enviado.");
    return NextResponse.json(
      { sent: false, reason: "Servicio de email no configurado" },
      { status: 200 } // No es error del usuario, simplemente no está configurado aún
    );
  }

  const supabase = await createClient();

  // 1. Obtener datos del pago
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (paymentError || !payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  // Solo enviar para pagos activos (no anulados)
  if (payment.status === "cancelado") {
    return NextResponse.json(
      { sent: false, reason: "No se envían comprobantes de pagos anulados" },
      { status: 200 }
    );
  }

  // 2. Verificar que el PDF ya fue generado
  if (!payment.pdf_url) {
    // Intentar generar el PDF primero llamando al endpoint de receipt
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    try {
      const pdfRes = await fetch(
        `${siteUrl}/api/payments/${paymentId}/receipt?condominiumId=${condominiumId}`,
        { method: "GET" }
      );
      if (pdfRes.ok) {
        // Re-leer el payment para obtener la pdf_url actualizada
        const { data: updatedPayment } = await supabase
          .from("payments")
          .select("pdf_url")
          .eq("id", paymentId)
          .maybeSingle();
        if (updatedPayment?.pdf_url) {
          payment.pdf_url = updatedPayment.pdf_url;
        }
      }
    } catch (e) {
      console.warn("[EDIFIKA Email] No se pudo generar PDF antes de enviar email:", e);
    }

    if (!payment.pdf_url) {
      return NextResponse.json(
        { sent: false, reason: "PDF del recibo no disponible" },
        { status: 200 }
      );
    }
  }

  // 3. Obtener email del residente
  let recipientEmail: string | null = null;
  let payerName = "Residente";
  let unitIdentifier = "";

  // Intentar desde payer_profile_id
  if (payment.payer_profile_id) {
    const { data: payer } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", payment.payer_profile_id)
      .maybeSingle();

    if (payer?.email) {
      recipientEmail = payer.email;
      payerName = payer.full_name || payerName;
    }
  }

  // Fallback: contacto principal de la unidad
  if (!recipientEmail && payment.unit_id) {
    const { data: contact } = await supabase
      .from("unit_contacts")
      .select("profiles(full_name, email)")
      .eq("unit_id", payment.unit_id)
      .eq("is_primary_contact", true)
      .is("end_date", null)
      .maybeSingle();

    const profile = contact?.profiles
      ? Array.isArray(contact.profiles)
        ? contact.profiles[0]
        : contact.profiles
      : null;

    if ((profile as any)?.email) {
      recipientEmail = (profile as any).email;
      payerName = (profile as any).full_name || payerName;
    }
  }

  if (!recipientEmail) {
    return NextResponse.json(
      { sent: false, reason: "El residente no tiene email registrado" },
      { status: 200 }
    );
  }

  // 4. Obtener datos de la unidad
  if (payment.unit_id) {
    const { data: unit } = await supabase
      .from("units")
      .select("full_identifier, identifier")
      .eq("id", payment.unit_id)
      .maybeSingle();
    unitIdentifier = unit?.full_identifier || unit?.identifier || "";
  }

  // 5. Obtener datos del condominio
  const { data: condo } = await supabase
    .from("condominiums")
    .select("name, logo_url")
    .eq("id", condominiumId)
    .maybeSingle();

  // 6. Obtener allocaciones para el detalle
  const { data: allocations } = await supabase
    .from("payment_allocations")
    .select(`
      amount_allocated,
      charge:charges(
        period,
        expense_item:expense_items(name)
      )
    `)
    .eq("payment_id", paymentId);

  const allocationDetails = (allocations || []).map((a: any) => {
    const charge = Array.isArray(a.charge) ? a.charge[0] : a.charge;
    const expenseItem = charge?.expense_item
      ? Array.isArray(charge.expense_item)
        ? charge.expense_item[0]
        : charge.expense_item
      : null;
    return {
      concepto: expenseItem?.name || "Pago",
      periodo: charge?.period || "-",
      asignado: formatCurrency(a.amount_allocated || 0),
    };
  });

  // 7. Enviar el email
  const receiptNumber = payment.folio_rec
    ? payment.folio_rec.toString().padStart(4, "0")
    : "--";

  const result = await sendPaymentReceiptEmail(recipientEmail, {
    condoName: condo?.name || "Condominio",
    condoLogoUrl: condo?.logo_url || null,
    payerName,
    unitIdentifier,
    receiptNumber,
    paymentDate: payment.payment_date || "-",
    paymentMethod: payment.payment_method || "-",
    totalAmount: formatCurrency(payment.total_amount || 0),
    pdfUrl: payment.pdf_url,
    allocations: allocationDetails,
  });

  // 8. Registrar el resultado en el log (opcional: guardar en BD en el futuro)
  if (result.success) {
    console.log(
      `[EDIFIKA Email] Recibo #${receiptNumber} enviado a ${recipientEmail} para unidad ${unitIdentifier}`
    );
  }

  return NextResponse.json({
    sent: result.success,
    emailId: result.emailId,
    recipientEmail,
    error: result.error,
  });
}

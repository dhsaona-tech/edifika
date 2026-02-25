"use server";

import { getResendClient, getFromEmail, getFromName } from "./resend";
import PaymentReceiptEmail from "./templates/PaymentReceiptEmail";
import type { PaymentReceiptEmailProps } from "./templates/PaymentReceiptEmail";
import { createElement } from "react";
import { render } from "@react-email/components";

export type SendReceiptResult = {
  success: boolean;
  emailId?: string;
  error?: string;
};

/**
 * Envía el email de comprobante de pago al residente.
 *
 * Diseño:
 * - NO adjunta el PDF (ahorra ancho de banda, evita spam filters)
 * - Incluye un botón con link firmado al PDF en Supabase Storage
 * - Es fire-and-forget: no debe bloquear el flujo del pago
 * - Loguea errores pero no los propaga al usuario
 */
export async function sendPaymentReceiptEmail(
  recipientEmail: string,
  props: PaymentReceiptEmailProps
): Promise<SendReceiptResult> {
  // Validar que el email del destinatario existe
  if (!recipientEmail || !recipientEmail.includes("@")) {
    console.warn(
      `[EDIFIKA Email] No se envía recibo #${props.receiptNumber}: email inválido o vacío (${recipientEmail})`
    );
    return { success: false, error: "Email del destinatario inválido o vacío" };
  }

  // Validar que el PDF URL existe
  if (!props.pdfUrl) {
    console.warn(
      `[EDIFIKA Email] No se envía recibo #${props.receiptNumber}: PDF URL no disponible`
    );
    return { success: false, error: "URL del PDF no disponible" };
  }

  try {
    const resend = getResendClient();
    const fromEmail = getFromEmail();
    const fromName = getFromName();

    // Renderizar el template a HTML
    const emailHtml = await render(
      createElement(PaymentReceiptEmail, props)
    );

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [recipientEmail],
      subject: `Comprobante de pago #${props.receiptNumber} - ${props.condoName}`,
      html: emailHtml,
    });

    if (error) {
      console.error(
        `[EDIFIKA Email] Error enviando recibo #${props.receiptNumber} a ${recipientEmail}:`,
        error
      );
      return { success: false, error: error.message || "Error de Resend" };
    }

    console.log(
      `[EDIFIKA Email] Recibo #${props.receiptNumber} enviado a ${recipientEmail} (ID: ${data?.id})`
    );
    return { success: true, emailId: data?.id };
  } catch (err: any) {
    console.error(
      `[EDIFIKA Email] Excepción enviando recibo #${props.receiptNumber}:`,
      err?.message || err
    );
    return { success: false, error: err?.message || "Error inesperado al enviar email" };
  }
}

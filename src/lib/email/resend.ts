import { Resend } from "resend";

// Singleton: una sola instancia de Resend para toda la app
let resendInstance: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY no está configurada en las variables de entorno. " +
        "Regístrate en https://resend.com y agrega la clave a .env.local"
      );
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

/**
 * Dirección de envío configurada por variable de entorno.
 * En modo testing de Resend (sin dominio verificado), usar: onboarding@resend.dev
 * Con dominio verificado: notificaciones@tudominio.com
 */
export function getFromEmail(): string {
  return process.env.FROM_EMAIL || "onboarding@resend.dev";
}

/**
 * Nombre que aparece como remitente del email.
 * Se puede personalizar por condominio en el futuro.
 */
export function getFromName(): string {
  return process.env.FROM_NAME || "EDIFIKA";
}

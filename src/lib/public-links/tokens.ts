import { createHmac, timingSafeEqual } from "crypto";

/**
 * Utilidad para generar y validar tokens firmados (HMAC-SHA256)
 * para links públicos de estado de cuenta.
 *
 * Formato del token: base64url(payload).base64url(signature)
 * Payload: unitId:condominiumId:expiresTimestamp
 */

const ALGORITHM = "sha256";

/** Expiry por defecto: 30 días */
const DEFAULT_EXPIRY_DAYS = 30;

function getSecret(): string {
  const secret =
    process.env.LINK_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      "LINK_SIGNING_SECRET o SUPABASE_SERVICE_ROLE_KEY debe estar configurado"
    );
  }
  return secret;
}

function toBase64Url(data: string): string {
  return Buffer.from(data, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf-8");
}

function sign(payload: string): string {
  const hmac = createHmac(ALGORITHM, getSecret());
  hmac.update(payload);
  return hmac
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface TokenPayload {
  unitId: string;
  condominiumId: string;
  expiresAt: number; // Unix timestamp en segundos
}

/**
 * Genera un token firmado para acceso público al estado de cuenta.
 * @param unitId - ID de la unidad
 * @param condominiumId - ID del condominio
 * @param expiryDays - Días de vigencia (default: 30)
 * @returns Token firmado (string URL-safe)
 */
export function generatePublicToken(
  unitId: string,
  condominiumId: string,
  expiryDays: number = DEFAULT_EXPIRY_DAYS
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiryDays * 86400;
  const payload = `${unitId}:${condominiumId}:${expiresAt}`;
  const encodedPayload = toBase64Url(payload);
  const signature = sign(payload);
  return `${encodedPayload}.${signature}`;
}

/**
 * Valida un token firmado y retorna el payload si es válido.
 * @param token - Token a validar
 * @returns Payload decodificado o null si el token es inválido/expirado
 */
export function validatePublicToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encodedPayload, providedSignature] = parts;
    const payload = fromBase64Url(encodedPayload);

    // Verificar firma con timing-safe comparison
    const expectedSignature = sign(payload);
    const sigBuffer = Buffer.from(providedSignature, "utf-8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");

    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    // Parsear payload
    const segments = payload.split(":");
    if (segments.length !== 3) return null;

    const [unitId, condominiumId, expiresStr] = segments;
    const expiresAt = parseInt(expiresStr, 10);

    if (!unitId || !condominiumId || isNaN(expiresAt)) return null;

    // Verificar expiración
    const now = Math.floor(Date.now() / 1000);
    if (now > expiresAt) return null;

    return { unitId, condominiumId, expiresAt };
  } catch {
    return null;
  }
}

/**
 * Genera la URL completa para el link público.
 * @param baseUrl - URL base de la app (e.g., https://edifika.app)
 * @param token - Token firmado
 */
export function getPublicUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/public/estado-cuenta/${token}`;
}

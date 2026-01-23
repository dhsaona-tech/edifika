/**
 * Utilidad para obtener el usuario actual con caché
 * Evita el rate limit de Supabase Auth en desarrollo
 */

import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

// MODO DESARROLLO: Bypass de auth para evitar rate limit
const DEV_MODE_BYPASS_AUTH = process.env.NODE_ENV === 'development' && process.env.DEV_PROFILE_ID;

/**
 * Obtiene el usuario autenticado actual (con caché durante el render)
 * Usa React cache para evitar múltiples llamadas en el mismo render
 */
export const getCurrentUser = cache(async () => {
  // En desarrollo, retornar un usuario mock para evitar rate limit
  if (DEV_MODE_BYPASS_AUTH) {
    console.log('🔧 [DEV] Usando bypass de autenticación con ID:', process.env.DEV_PROFILE_ID);
    return {
      id: process.env.DEV_PROFILE_ID!,
      email: 'dev@edifika.local',
      aud: 'authenticated',
      role: 'authenticated',
    } as any;
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Error al obtener usuario:", error);
    return null;
  }

  return user;
});

/**
 * Versión que requiere autenticación (lanza error si no hay usuario)
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  return user;
}

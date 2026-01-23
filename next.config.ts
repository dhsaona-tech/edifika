import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración vacía de Turbopack para silenciar el warning
  // El warning de source map de @supabase/auth-js es un problema conocido
  // y no afecta la funcionalidad
  turbopack: {},
};

export default nextConfig;

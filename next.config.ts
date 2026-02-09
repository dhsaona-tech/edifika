import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Usar webpack en lugar de Turbopack por estabilidad
  // Turbopack tiene problemas con middleware en Next.js 16
};

export default nextConfig;

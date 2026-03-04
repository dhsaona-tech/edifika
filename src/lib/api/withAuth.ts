import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Wrapper de autenticación para API routes.
 * Verifica que el usuario esté autenticado antes de ejecutar el handler.
 */
export function withAuth<P = Record<string, string>>(
  handler: (
    request: NextRequest,
    context: {
      user: { id: string; email?: string };
      supabase: Awaited<ReturnType<typeof createClient>>;
      params: P;
    }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, ctx: { params: Promise<P> | P }) => {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const params = ctx.params instanceof Promise ? await ctx.params : ctx.params;
    return handler(request, { user, supabase, params });
  };
}

/**
 * Wrapper de autenticación + verificación de membresía en condominio.
 * El condominiumId se extrae de:
 * 1. Query param "condominiumId"
 * 2. Body JSON field "condominiumId"
 * 3. FormData field "condominiumId"
 *
 * Si no se puede extraer, usa la función extractCondoId proporcionada.
 */
export function withCondoAuth<P = Record<string, string>>(
  handler: (
    request: NextRequest,
    context: {
      user: { id: string; email?: string };
      supabase: Awaited<ReturnType<typeof createClient>>;
      params: P;
      condominiumId: string;
    }
  ) => Promise<NextResponse>,
  options?: {
    extractCondoId?: (request: NextRequest, params: P) => string | null;
  }
) {
  return withAuth<P>(async (request, { user, supabase, params }) => {
    // Intentar extraer condominiumId de varias fuentes
    let condominiumId: string | null = null;

    // 1. Custom extractor
    if (options?.extractCondoId) {
      condominiumId = options.extractCondoId(request, params);
    }

    // 2. Query params
    if (!condominiumId) {
      const url = new URL(request.url);
      condominiumId = url.searchParams.get("condominiumId");
    }

    if (!condominiumId) {
      return NextResponse.json(
        { error: "Falta condominiumId" },
        { status: 400 }
      );
    }

    // Verificar membresía o superadmin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_superadmin) {
      const { data: membership } = await supabase
        .from("memberships")
        .select("id")
        .eq("profile_id", user.id)
        .eq("condominium_id", condominiumId)
        .eq("status", "activo")
        .maybeSingle();

      if (!membership) {
        return NextResponse.json(
          { error: "Sin acceso a este condominio" },
          { status: 403 }
        );
      }
    }

    return handler(request, { user, supabase, params, condominiumId });
  });
}

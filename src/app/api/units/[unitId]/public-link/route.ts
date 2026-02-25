import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePublicToken, getPublicUrl } from "@/lib/public-links/tokens";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { unitId } = await params;
    const body = await request.json().catch(() => ({}));
    const condominiumId = body.condominiumId as string | undefined;
    const expiryDays = (body.expiryDays as number) || 30;

    if (!condominiumId) {
      return NextResponse.json(
        { error: "condominiumId requerido" },
        { status: 400 }
      );
    }

    // Verificar que la unidad pertenece al condominio
    const { data: unit, error: unitError } = await supabase
      .from("units")
      .select("id, identifier, full_identifier")
      .eq("id", unitId)
      .eq("condominium_id", condominiumId)
      .single();

    if (unitError || !unit) {
      return NextResponse.json(
        { error: "Unidad no encontrada" },
        { status: 404 }
      );
    }

    // Generar token firmado
    const token = generatePublicToken(unitId, condominiumId, expiryDays);

    // Construir URL base
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    const publicUrl = getPublicUrl(baseUrl, token);

    return NextResponse.json({
      url: publicUrl,
      token,
      expiresAt: new Date(
        Date.now() + expiryDays * 86400 * 1000
      ).toISOString(),
      unit: {
        id: unit.id,
        identifier: unit.full_identifier || unit.identifier,
      },
    });
  } catch (error) {
    console.error("Error generando link público:", error);
    return NextResponse.json(
      { error: "Error generando enlace", details: String(error) },
      { status: 500 }
    );
  }
}

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = createAdminClient() as any;

    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Obtener parámetros
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json({ error: "ID de documento requerido" }, { status: 400 });
    }

    // Obtener el documento
    const { data: doc, error: docError } = await adminClient
      .from("documents")
      .select("*, condominium:condominiums(id)")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    // Verificar permisos del usuario
    const { data: profile } = await adminClient
      .from("profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .single();

    const { data: membership } = await adminClient
      .from("memberships")
      .select("role, status")
      .eq("profile_id", user.id)
      .eq("condominium_id", doc.condominium_id)
      .eq("status", "activo")
      .maybeSingle();

    // Si no es superadmin y no tiene membresía activa, denegar
    if (!profile?.is_superadmin && !membership) {
      return NextResponse.json({ error: "No tienes acceso a este documento" }, { status: 403 });
    }

    // Verificar visibilidad del documento para residentes
    if (membership && !["ADMIN", "SUPER_ADMIN"].includes(membership.role)) {
      if (doc.visibility === "solo_admin") {
        return NextResponse.json({ error: "Este documento es solo para administradores" }, { status: 403 });
      }

      // Para "residentes_al_dia", verificar que no tenga deuda
      if (doc.visibility === "residentes_al_dia") {
        const { data: balance } = await adminClient
          .from("unit_balances")
          .select("balance")
          .eq("condominium_id", doc.condominium_id)
          .eq("profile_id", user.id)
          .maybeSingle();

        if (balance && balance.balance < 0) {
          return NextResponse.json({ error: "Debes estar al día en tus pagos para ver este documento" }, { status: 403 });
        }
      }
    }

    // Extraer el path del archivo desde la URL almacenada
    const fileUrl = doc.file_url as string;
    const bucket = "docs-conjuntos";

    // La URL tiene formato: https://xxx.supabase.co/storage/v1/object/public/bucket/path
    // Necesitamos extraer solo el path
    const urlParts = fileUrl.split(`/${bucket}/`);
    const filePath = urlParts[1] || "";

    if (!filePath) {
      return NextResponse.json({ error: "Ruta de archivo inválida" }, { status: 400 });
    }

    // Check if download is requested
    const download = searchParams.get("download") === "1";

    // Generar URL firmada (válida por 1 hora)
    const { data: signedData, error: signedError } = await adminClient.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600, {
        download: download ? doc.title + ".pdf" : undefined,
      });

    if (signedError || !signedData) {
      console.error("Error creating signed URL:", signedError);
      return NextResponse.json({ error: "Error al generar URL de acceso" }, { status: 500 });
    }

    // Redirigir al archivo
    return NextResponse.redirect(signedData.signedUrl);
  } catch (error: any) {
    console.error("View document error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

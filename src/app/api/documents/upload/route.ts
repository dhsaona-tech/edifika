import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// Configuración para permitir archivos grandes
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  try {
    // Cliente normal para autenticación
    const supabase = await createClient();

    // Cliente admin para bypass de RLS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = createAdminClient() as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verificar que el usuario sea admin o superadmin
    const { data: profile } = await adminClient
      .from("profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .single();

    const { data: membership } = await adminClient
      .from("memberships")
      .select("role")
      .eq("profile_id", user.id)
      .in("role", ["ADMIN", "SUPER_ADMIN"])
      .eq("status", "activo")
      .maybeSingle();

    if (!profile?.is_superadmin && !membership) {
      return NextResponse.json({ error: "No tienes permisos para subir documentos" }, { status: 403 });
    }

    const formData = await request.formData();
    const condominiumId = formData.get("condominium_id") as string;
    const title = (formData.get("title") as string)?.trim();
    const documentType = formData.get("document_type") as string;
    const visibility = formData.get("visibility") as string;
    const folderId = formData.get("folder_id") as string | null;
    const file = formData.get("file") as File | null;

    if (!title) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Debes seleccionar un archivo" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo no puede superar ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const fileExt = file.name.split(".").pop() || "pdf";
    const storagePath = `${condominiumId}/documents/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

    const bucket = "docs-conjuntos";

    const { error: uploadError } = await adminClient.storage
      .from(bucket)
      .upload(storagePath, file, {
        contentType: file.type || "application/pdf",
      });

    if (uploadError) {
      return NextResponse.json({ error: `Error al subir archivo: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = adminClient.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    const { error: insertError } = await adminClient.from("documents").insert({
      condominium_id: condominiumId,
      title,
      document_type: documentType,
      visibility,
      folder_id: folderId && folderId !== "" ? folderId : null,
      file_url: urlData.publicUrl,
      uploaded_by_profile_id: user.id,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const message = error?.message ?? String(error);
    const details = error?.cause ?? error?.stack;
    console.error("Upload error:", message, details != null ? "\n" + details : "");
    return NextResponse.json(
      { error: message || "Error al procesar la subida. Revisa la consola del servidor." },
      { status: 500 }
    );
  }
}

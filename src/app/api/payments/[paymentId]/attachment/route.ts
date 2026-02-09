import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export async function POST(req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const supabase = await createClient();
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_ATTACHMENTS || "pdfs";

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const condominiumId = form.get("condominiumId")?.toString().trim();
  const isUuid = (val?: string | null) => !!val && /^[0-9a-fA-F-]{36}$/.test(val);

  if (!isUuid(condominiumId)) {
    return NextResponse.json({ error: "Falta condominiumId" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  // Leer buffer del archivo
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const ext = file.name.split(".").pop() || "jpg";
  const path = `attachments/${paymentId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: true });

  if (uploadError) {
    console.error("Error subiendo comprobante", uploadError);
    const msg =
      uploadError.message?.includes("Bucket not found") || (uploadError as any).statusCode === "404"
        ? `Falta crear el bucket "${bucket}" en Supabase Storage`
        : "No se pudo subir el comprobante";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  const fallbackPublic =
    process.env.NEXT_PUBLIC_SUPABASE_URL && path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
      : null;
  const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year
  const publicUrl = signedData?.signedUrl || publicData?.publicUrl || fallbackPublic || null;

  const { error: updateError } = await supabase
    .from("payments")
    .update({ attachment_url: publicUrl || path })
    .eq("id", paymentId)
    .eq("condominium_id", condominiumId);
  if (updateError) {
    console.error("Error guardando attachment_url", updateError);
    return NextResponse.json({ error: "No se pudo guardar el comprobante en el pago" }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl });
}



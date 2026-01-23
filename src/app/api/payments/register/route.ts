import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelPayment, createPayment } from "@/app/app/[id]/payments/actions";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let payload: any = null;
    let attachment: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const rawPayload = form.get("payload");
      if (rawPayload) {
        try {
          payload = JSON.parse(rawPayload.toString());
        } catch (e) {
          return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
        }
      }
      attachment = (form.get("attachment") as File) || null;
    } else {
      payload = await request.json();
    }

    const { condominiumId, general, apply, direct } = payload || {};
    if (!condominiumId || !general) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const res = await createPayment(condominiumId, { general, apply, direct });
    if (res?.error) return NextResponse.json({ error: res.error }, { status: 400 });

    const paymentId = (res as any).paymentId || null;
    if (!paymentId) return NextResponse.json({ error: "No se pudo crear el ingreso." }, { status: 500 });

    if (attachment) {
      const supabase = await createClient();
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_ATTACHMENTS || "pdfs";

      const arrayBuffer = await attachment.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = attachment.name.split(".").pop() || "jpg";
      const path = `attachments/${paymentId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, buffer, { contentType: attachment.type || "application/octet-stream", upsert: true });

      if (uploadError) {
        console.error("Error subiendo comprobante (registro)", uploadError);
        const msg =
          uploadError.message?.includes("Bucket not found") || uploadError.statusCode === "404"
            ? `Falta crear el bucket "${bucket}" en Supabase Storage`
            : "No se pudo subir el comprobante.";
        const cancelRes = await cancelPayment(condominiumId, paymentId, "Error subiendo comprobante");
        const cancelNote = cancelRes?.error ? " (el ingreso quedo creado, revisa su anulacion manualmente)" : "";
        return NextResponse.json({ error: `${msg}${cancelNote}` }, { status: 500 });
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
        console.error("Error guardando attachment_url (registro)", updateError);
        const cancelRes = await cancelPayment(condominiumId, paymentId, "Error guardando comprobante");
        const cancelNote = cancelRes?.error ? " (el ingreso quedo creado, revisa su anulacion manualmente)" : "";
        return NextResponse.json(
          { error: `No se pudo guardar el comprobante en el ingreso.${cancelNote}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, paymentId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error registrando pago" }, { status: 500 });
  }
}


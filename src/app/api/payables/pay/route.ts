import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEgressForPayables } from "@/app/app/[id]/payables/actions";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Se requiere multipart/form-data" }, { status: 400 });
    }

    const form = await request.formData();
    const rawPayload = form.get("payload");
    const proof = form.get("proof") as File | null;

    if (!rawPayload) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    if (proof && proof.type !== "application/pdf") return NextResponse.json({ error: "Solo se permiten PDF" }, { status: 400 });

    let payload: any = null;
    try {
      payload = JSON.parse(rawPayload.toString());
    } catch (e) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const { condominium_id } = payload || {};
    if (!condominium_id) return NextResponse.json({ error: "Falta condominium_id" }, { status: 400 });

    const res = await createEgressForPayables(condominium_id, payload);
    if (res?.error) return NextResponse.json({ error: res.error }, { status: 400 });
    const egressId = (res as any).egressId;
    if (!egressId) return NextResponse.json({ error: "No se pudo crear el egreso" }, { status: 500 });

    if (proof) {
      const supabase = await createClient();
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_ATTACHMENTS || "pdfs";
      const buffer = Buffer.from(await proof.arrayBuffer());
      const path = `egresses/proofs/${egressId}-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, buffer, { contentType: "application/pdf", upsert: true });
      if (!uploadError) {
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
        const fallbackPublic =
          process.env.NEXT_PUBLIC_SUPABASE_URL && path
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
            : null;
        const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
        const publicUrl = signedData?.signedUrl || publicData?.publicUrl || fallbackPublic || path;

        await supabase
          .from("egresses")
          .update({ pdf_url: publicUrl })
          .eq("id", egressId)
          .eq("condominium_id", condominium_id);
      } else {
        console.error("Error subiendo comprobante egreso", uploadError);
      }
    }

    return NextResponse.json({ success: true, egressId });
  } catch (e: any) {
    console.error("Error registrando pago OP", e);
    return NextResponse.json({ error: e?.message || "Error registrando pago" }, { status: 500 });
  }
}

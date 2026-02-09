import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updatePayable } from "@/app/app/[id]/payables/actions";

type ParamsArg = { id: string } | Promise<{ id: string }>;

export async function POST(request: Request, ctx: { params: ParamsArg }) {
  const resolved = await ctx.params;
  const payableId = resolved.id;

  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Se requiere multipart/form-data" }, { status: 400 });
    }

    const form = await request.formData();
    const rawPayload = form.get("payload");
    const invoice = form.get("invoice") as File | null;

    if (!rawPayload) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    if (invoice && invoice.type !== "application/pdf") return NextResponse.json({ error: "Solo se permite PDF" }, { status: 400 });

    let payload: any = null;
    try {
      payload = JSON.parse(rawPayload.toString());
    } catch (e) {
      return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
    }

    const { condominiumId, general } = payload || {};
    if (!condominiumId || !general) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const res = await updatePayable(condominiumId, payableId, general);
    if (res?.error) return NextResponse.json({ error: res.error }, { status: 400 });

    if (invoice) {
      const supabase = await createClient();
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_ATTACHMENTS || "pdfs";
      const buffer = Buffer.from(await invoice.arrayBuffer());
      const path = `payables/invoices/${payableId}-${Date.now()}.pdf`;
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
          .from("payable_orders")
          .update({ invoice_file_url: publicUrl })
          .eq("id", payableId)
          .eq("condominium_id", condominiumId);
      } else {
        console.error("Error subiendo factura OP (update)", uploadError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Error actualizando OP", e);
    return NextResponse.json({ error: e?.message || "Error actualizando OP" }, { status: 500 });
  }
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { validateRUC } from "@/lib/validations";

const UpdateCondominiumSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  ruc: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  administrator_name: z.string().optional().or(z.literal("")),
  property_type: z.enum(["urbanizacion", "conjunto", "edificio"]).optional(),
  logo_url: z.string().optional().or(z.literal("")),
});

export async function getCondominiumInfo(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("condominiums")
    .select("*")
    .eq("id", condominiumId)
    .single();

  if (error) {
    console.error("Error obteniendo información del condominio", error);
    return null;
  }

  if (!data) return null;

  // Mapear campos de la BD al formato esperado por el formulario
  return {
    ...data,
    ruc: data.fiscal_id || null,
    property_type: data.type || null,
    phone: data.phone || null,
    administrator_name: null, // Este campo aún no existe en la BD
  };
}

export async function updateCondominiumInfo(condominiumId: string, formData: FormData) {
  const supabase = await createClient();

  // Normalizar valores: convertir null a string vacío y asegurar tipos correctos
  const normalizeString = (value: FormDataEntryValue | null): string => {
    if (value === null || typeof value !== "string") return "";
    return value;
  };

  const rawData = {
    name: normalizeString(formData.get("name")),
    ruc: normalizeString(formData.get("ruc")),
    address: normalizeString(formData.get("address")),
    phone: normalizeString(formData.get("phone")),
    administrator_name: normalizeString(formData.get("administrator_name")),
    property_type: normalizeString(formData.get("property_type")),
    logo_url: normalizeString(formData.get("logo_url")),
  };

  // Validar RUC si se proporciona
  if (rawData.ruc && rawData.ruc !== "") {
    const rucValidation = validateRUC(rawData.ruc);
    if (!rucValidation.isValid) {
      return { error: rucValidation.error };
    }
  }

  // Convertir property_type vacío a undefined para que Zod lo trate como opcional
  const dataForValidation = {
    ...rawData,
    property_type: rawData.property_type === "" ? undefined : rawData.property_type,
  };

  const result = UpdateCondominiumSchema.safeParse(dataForValidation);
  if (!result.success) {
    // Obtener el primer error con más contexto
    const firstIssue = result.error.issues && result.error.issues.length > 0 
      ? result.error.issues[0]
      : null;
    
    if (firstIssue) {
      const fieldName = firstIssue.path.join(".");
      const errorMessage = firstIssue.message || "Error de validación";
      return { error: `${fieldName ? `${fieldName}: ` : ""}${errorMessage}` };
    }
    
    return { error: "Error de validación. Por favor, verifica los datos ingresados." };
  }

  const { data, error } = await supabase
    .from("condominiums")
    .update({
      name: result.data.name,
      fiscal_id: result.data.ruc || null,
      address: result.data.address || null,
      phone: result.data.phone || null,
      type: result.data.property_type || null,
      logo_url: result.data.logo_url || null,
    })
    .eq("id", condominiumId)
    .select()
    .single();

  if (error) {
    console.error("Error actualizando condominio", error);
    return { error: "No se pudo actualizar la información" };
  }

  revalidatePath(`/app/${condominiumId}/my-condo`);
  revalidatePath(`/app/${condominiumId}`); // Revalidar toda la app para que se refleje en PDFs, etc.

  return { success: true, data };
}

export async function uploadLogo(condominiumId: string, formData: FormData) {
  const supabase = await createClient();
  const file = formData.get("logo") as File | null;

  if (!file) {
    return { error: "No se seleccionó ningún archivo" };
  }

  // Validar tipo de archivo
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Solo se permiten imágenes (JPEG, PNG, WEBP)" };
  }

  // Validar tamaño (máximo 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return { error: "El archivo no debe superar 2MB" };
  }

  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_ATTACHMENTS || "pdfs";
  const ext = file.name.split(".").pop() || "jpg";
  const path = `logos/${condominiumId}-${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("Error subiendo logo", uploadError);
    return { error: "No se pudo subir el logo" };
  }

  // Obtener URL pública
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  const { data: signedData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 año

  const logoUrl = signedData?.signedUrl || publicData?.publicUrl || path;

  // Actualizar en la base de datos
  const { error: updateError } = await supabase
    .from("condominiums")
    .update({ logo_url: logoUrl })
    .eq("id", condominiumId);

  if (updateError) {
    console.error("Error actualizando logo_url", updateError);
    return { error: "No se pudo guardar la URL del logo" };
  }

  revalidatePath(`/app/${condominiumId}/my-condo`);
  revalidatePath(`/app/${condominiumId}`);

  return { success: true, logoUrl };
}

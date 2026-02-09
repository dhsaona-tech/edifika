"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ==================== TIPOS ====================

export interface DocumentFolder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  sort_order: number;
  created_at: string;
  document_count?: number;
}

export interface Document {
  id: string;
  title: string;
  document_type: string;
  visibility: string;
  file_url: string;
  folder_id: string | null;
  uploaded_by_profile_id: string;
  created_at: string;
  uploaded_by?: { full_name: string } | null;
  folder?: { id: string; name: string } | null;
}

// ==================== CARPETAS ====================

export async function getFolders(condominiumId: string) {
  const supabase = await createClient();

  const { data: folders, error } = await supabase
    .from("document_folders")
    .select("*")
    .eq("condominium_id", condominiumId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return [];
  return folders as DocumentFolder[];
}

export async function createFolder(condominiumId: string, name: string, parentFolderId?: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("document_folders").insert({
    condominium_id: condominiumId,
    name: name.trim(),
    parent_folder_id: parentFolderId || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/app/${condominiumId}/documents`);
  return { error: null };
}

export async function renameFolder(condominiumId: string, folderId: string, name: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("document_folders")
    .update({ name: name.trim() })
    .eq("id", folderId);

  if (error) return { error: error.message };

  revalidatePath(`/app/${condominiumId}/documents`);
  return { error: null };
}

export async function deleteFolder(condominiumId: string, folderId: string) {
  const supabase = await createClient();

  // Verificar que no tenga documentos
  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("folder_id", folderId);

  if (count && count > 0) {
    return { error: "No se puede eliminar una carpeta con documentos. Mueve o elimina los documentos primero." };
  }

  // Verificar que no tenga subcarpetas
  const { count: subCount } = await supabase
    .from("document_folders")
    .select("id", { count: "exact", head: true })
    .eq("parent_folder_id", folderId);

  if (subCount && subCount > 0) {
    return { error: "No se puede eliminar una carpeta con subcarpetas." };
  }

  const { error } = await supabase
    .from("document_folders")
    .delete()
    .eq("id", folderId);

  if (error) return { error: error.message };

  revalidatePath(`/app/${condominiumId}/documents`);
  return { error: null };
}

// ==================== DOCUMENTOS ====================

export async function getDocuments(condominiumId: string, folderId?: string | null, search?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select("*, uploaded_by:profiles!uploaded_by_profile_id(full_name), folder:document_folders!folder_id(id, name)")
    .eq("condominium_id", condominiumId)
    .order("created_at", { ascending: false });

  if (folderId) {
    query = query.eq("folder_id", folderId);
  } else if (folderId === null) {
    query = query.is("folder_id", null);
  }

  if (search && search.trim()) {
    query = query.ilike("title", `%${search.trim()}%`);
  }

  const { data, error } = await query;

  if (error) return [];
  return data as Document[];
}

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient();

  const condominiumId = formData.get("condominium_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const documentType = formData.get("document_type") as string;
  const visibility = formData.get("visibility") as string;
  const folderId = formData.get("folder_id") as string | null;
  const file = formData.get("file") as File;

  if (!title) return { error: "El título es obligatorio" };
  if (!file || file.size === 0) return { error: "Debes seleccionar un archivo" };

  // Validar tamaño (20MB max)
  if (file.size > 20 * 1024 * 1024) {
    return { error: "El archivo no puede superar 20MB" };
  }

  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Subir archivo a Storage
  const fileExt = file.name.split(".").pop();
  const fileName = `${condominiumId}/documents/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

  const bucket = "docs-conjuntos";
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, file);

  if (uploadError) return { error: `Error al subir archivo: ${uploadError.message}` };

  // Obtener URL pública
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  // Insertar registro
  const { error: insertError } = await supabase.from("documents").insert({
    condominium_id: condominiumId,
    title,
    document_type: documentType,
    visibility,
    folder_id: folderId || null,
    file_url: urlData.publicUrl,
    uploaded_by_profile_id: user.id,
  });

  if (insertError) return { error: insertError.message };

  revalidatePath(`/app/${condominiumId}/documents`);
  return { error: null };
}

export async function deleteDocument(condominiumId: string, documentId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (error) return { error: error.message };

  revalidatePath(`/app/${condominiumId}/documents`);
  return { error: null };
}

export async function moveDocument(condominiumId: string, documentId: string, folderId: string | null) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("documents")
    .update({ folder_id: folderId })
    .eq("id", documentId);

  if (error) return { error: error.message };

  revalidatePath(`/app/${condominiumId}/documents`);
  return { error: null };
}

export async function updateDocumentVisibility(condominiumId: string, documentId: string, visibility: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("documents")
    .update({ visibility })
    .eq("id", documentId);

  if (error) return { error: error.message };

  revalidatePath(`/app/${condominiumId}/documents`);
  return { error: null };
}

export async function updateDocument(
  condominiumId: string,
  documentId: string,
  data: { title?: string; document_type?: string; visibility?: string }
) {
  const supabase = await createClient();

  const updateData: Record<string, string> = {};
  if (data.title) updateData.title = data.title.trim();
  if (data.document_type) updateData.document_type = data.document_type;
  if (data.visibility) updateData.visibility = data.visibility;

  if (Object.keys(updateData).length === 0) {
    return { error: "No hay datos para actualizar" };
  }

  const { error } = await supabase
    .from("documents")
    .update(updateData)
    .eq("id", documentId);

  if (error) return { error: error.message };

  revalidatePath(`/app/${condominiumId}/documents`);
  return { error: null };
}

export async function getDocument(documentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*, uploaded_by:profiles!uploaded_by_profile_id(full_name)")
    .eq("id", documentId)
    .single();

  if (error) return null;
  return data as Document;
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { ResidentSummary, ProfilePreferences } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Defino el tipo de respuesta para que los componentes (ContactInfoCard, Modal) no se quejen
export type ActionResponse = Promise<{ success?: boolean; error?: string; message?: string }>;

// ==========================================
// 1. SCHEMAS (Validación)
// ==========================================
const ResidentSchema = z.object({
  first_name: z.string().min(1, "Nombre requerido"),
  last_name: z.string().min(1, "Apellido requerido"),
  email: z.string().email("Correo requerido"),
  doc_type: z.string().default("CEDULA"),
  national_id: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  country: z.string().default("Ecuador (+593)"),
  address: z.string().optional().or(z.literal("")),
  is_legal_entity: z.boolean().default(false),
  lives_in_unit: z.boolean().default(true),
  role: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  // Selector de unidad
  selected_unit_id: z.string().optional().or(z.literal("")),
});

// ==========================================
// 2. LECTURA (GET)
// ==========================================
export async function getResidents(
  condominiumId: string,
  query?: string,
  roleFilter: "owner" | "tenant" | "all" = "all",
  hasUnitFilter: "yes" | "no" | "all" = "all"
) {
  const supabase = await createClient();

  // A. Buscar Miembros
  const membersQuery = supabase
    .from("memberships")
    .select(`profile:profiles!inner(*)`)
    .eq("condominium_id", condominiumId);

  // B. Buscar Contactos de Unidad
  const contactsQuery = supabase
    .from("unit_contacts")
    .select(`
      profile_id,
      relationship_type,
      profile:profiles!inner(*),
      unit:units!inner(identifier, type, block_identifier, condominium_id)
    `)
    .eq("unit.condominium_id", condominiumId)
    .is("end_date", null);

  const [membersRes, contactsRes] = await Promise.all([membersQuery, contactsQuery]);

  const residentsMap = new Map<string, ResidentSummary>();

  // 1. Procesar Miembros
  (membersRes.data || []).forEach((row: any) => {
    const p = row.profile;
    residentsMap.set(p.id, { ...p, units_owned: [], units_rented: [], roles: [] });
  });

  // 2. Procesar Unidades
  (contactsRes.data || []).forEach((c: any) => {
    const p = c.profile;
    if (!residentsMap.has(p.id)) {
      residentsMap.set(p.id, { ...p, units_owned: [], units_rented: [], roles: [] });
    }
    const resident = residentsMap.get(p.id)!;
    
    const unitName = c.unit.block_identifier 
        ? `${c.unit.block_identifier} ${c.unit.identifier}`
        : `${c.unit.type.charAt(0).toUpperCase() + c.unit.type.slice(1)} ${c.unit.identifier}`;

    if (c.relationship_type === 'OWNER') {
      if (!resident.units_owned.includes(unitName)) resident.units_owned.push(unitName);
      if (!resident.roles.includes('Propietario')) resident.roles.push('Propietario');
    } else if (c.relationship_type === 'TENANT') {
      if (!resident.units_rented.includes(unitName)) resident.units_rented.push(unitName);
      if (!resident.roles.includes('Inquilino')) resident.roles.push('Inquilino');
    }
  });

  // 3. Filtros
  let results = Array.from(residentsMap.values());
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(r => 
      (r.full_name && r.full_name.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.national_id && r.national_id.includes(q))
    );
  }

  // Filtro por rol (propietario / inquilino)
  if (roleFilter === "owner") {
    results = results.filter(r => r.roles.includes("Propietario"));
  } else if (roleFilter === "tenant") {
    results = results.filter(r => r.roles.includes("Inquilino"));
  }

  // Filtro por unidad asignada
  if (hasUnitFilter === "yes") {
    results = results.filter(r => (r.units_owned.length + r.units_rented.length) > 0);
  } else if (hasUnitFilter === "no") {
    results = results.filter(r => (r.units_owned.length + r.units_rented.length) === 0);
  }

  return results;
}

export async function getResidentProfile(condominiumId: string, profileId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", profileId).single();
  if (!profile) return null;
  const { data: history } = await supabase.from("unit_contacts")
    .select(`*, unit:units!inner(*)`)
    .eq("profile_id", profileId).eq("unit.condominium_id", condominiumId).order("start_date", { ascending: false });
  return { profile, history: history || [] };
}

// ==========================================
// 3. ESCRITURA (CREATE & UPDATE)
// ==========================================

export async function createOrLinkResident(
  condominiumId: string, 
  unitIdArg: string | null, 
  formData: FormData
): ActionResponse {
  const supabase = await createClient();

  // Sanitización para evitar "invalid null"
  const rawData = {
    first_name: formData.get("first_name")?.toString() || "",
    last_name: formData.get("last_name")?.toString() || "",
    email: formData.get("email")?.toString() || "",
    doc_type: formData.get("doc_type")?.toString() || "CEDULA",
    national_id: formData.get("national_id")?.toString() || "", 
    phone: formData.get("phone")?.toString() || "",
    country: formData.get("country")?.toString() || "",
    address: formData.get("address")?.toString() || "",
    role: formData.get("role")?.toString() || "",
    notes: formData.get("notes")?.toString() || "",
    is_legal_entity: formData.get("is_legal_entity") === "on",
    lives_in_unit: formData.get("lives_in_unit") === "on",
    selected_unit_id: formData.get("selected_unit_id")?.toString() || "",
  };

  const validation = ResidentSchema.safeParse(rawData);
  if (!validation.success) return { error: validation.error.issues[0].message };
  const data = validation.data;
  
  // Determinar unidad objetivo
  const targetUnitId = unitIdArg || (data.selected_unit_id !== "" ? data.selected_unit_id : null);
  const fullName = `${data.first_name} ${data.last_name}`.trim();

  // Anti-Duplicados (Cédula O Email)
  let dbQuery = supabase.from("profiles").select("id, full_name");
  
  // CORRECCIÓN TS: Verificamos existencia antes de length
  if (data.national_id && data.national_id.length > 3) {
    dbQuery = dbQuery.or(`national_id.eq.${data.national_id},email.eq.${data.email}`);
  } else {
    dbQuery = dbQuery.eq("email", data.email);
  }
  
  const { data: existingProfiles } = await dbQuery;
  let profileId = existingProfiles?.[0]?.id;

  // Crear si no existe
  if (!profileId) {
    const newId = crypto.randomUUID();
    // CORRECCIÓN TS: Verificamos existencia antes de trim
    const cleanNationalId = (data.national_id && data.national_id.trim() !== "") ? data.national_id : null;

    const { error } = await supabase.from("profiles").insert({
        id: newId, first_name: data.first_name, last_name: data.last_name, full_name: fullName, email: data.email,
        national_id: cleanNationalId, id_type: data.doc_type, phone: data.phone, address: data.address,
        country: data.country, is_legal_entity: data.is_legal_entity, notes: data.notes,
        preferences: { notify_news: true, notify_statements: true, channel: 'email' }
    });
    if (error) return { error: error.code === '23505' ? "Correo o cédula duplicada." : "Error creando perfil." };
    profileId = newId;
  }

  // GARANTIZAR MEMBRESÍA (Para que aparezca en lista)
  await supabase.from("memberships").upsert({
    condominium_id: condominiumId, profile_id: profileId, role: 'RESIDENT', status: 'activo'
  }, { onConflict: 'condominium_id, profile_id' });

  // Vincular a Unidad
  if (targetUnitId && profileId) {
    const { data: existing } = await supabase.from("unit_contacts")
      .select("id").eq("unit_id", targetUnitId).eq("profile_id", profileId).is("end_date", null).single();

    if (!existing) {
      const { error: linkError } = await supabase.from("unit_contacts").insert({
        unit_id: targetUnitId,
        profile_id: profileId,
        relationship_type: data.role || "TENANT",
        is_primary_contact: false,
        is_current_occupant: data.lives_in_unit,
        receives_debt_emails: true,
        start_date: new Date().toISOString(),
      });
      if (linkError) console.error("Link Error", linkError);
    }
  }

  revalidatePath(`/app/${condominiumId}/residents`);
  return { success: true, message: "Guardado correctamente." };
}

export async function updateResidentProfile(
  condominiumId: string, 
  profileId: string, 
  formData: FormData
): ActionResponse {
  const supabase = await createClient();
  
  const rawData = {
    first_name: formData.get("first_name")?.toString() || "",
    last_name: formData.get("last_name")?.toString() || "",
    email: formData.get("email")?.toString() || "",
    doc_type: formData.get("doc_type")?.toString() || "CEDULA",
    national_id: formData.get("national_id")?.toString() || "",
    phone: formData.get("phone")?.toString() || "",
    address: formData.get("address")?.toString() || "",
    country: formData.get("country")?.toString() || "",
    notes: formData.get("notes")?.toString() || "",
    is_legal_entity: formData.get("is_legal_entity") === "on",
    notify_statements: formData.get("notify_statements") === "on",
    notify_receipts: formData.get("notify_receipts") === "on",
    notify_news: formData.get("notify_news") === "on",
  };

  const UpdateSchema = ResidentSchema.pick({
    first_name: true, last_name: true, email: true, doc_type: true, national_id: true,
    phone: true, address: true, country: true, is_legal_entity: true, notes: true
  }).extend({
    notify_statements: z.boolean(), notify_receipts: z.boolean(), notify_news: z.boolean(),
  });

  const validation = UpdateSchema.safeParse(rawData);
  if (!validation.success) return { error: "Datos inválidos: " + validation.error.issues[0].message };
  const data = validation.data;
  const fullName = `${data.first_name} ${data.last_name}`.trim();
  
  // CORRECCIÓN TS: Verificamos existencia
  const cleanNationalId = (data.national_id && data.national_id.trim() !== "") ? data.national_id : null;

  const { error } = await supabase.from("profiles").update({
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: fullName,
      email: data.email,
      national_id: cleanNationalId,
      id_type: data.doc_type,
      phone: data.phone,
      address: data.address,
      country: data.country,
      is_legal_entity: data.is_legal_entity,
      notes: data.notes,
      preferences: {
        notify_statements: data.notify_statements,
        notify_receipts: data.notify_receipts,
        notify_news: data.notify_news,
        channel: "email"
      }
    }).eq("id", profileId);

  if (error) {
    if (error.code === '23505') return { error: "Correo o cédula duplicada." };
    return { error: "Error al actualizar." };
  }

  revalidatePath(`/app/${condominiumId}/residents`);
  revalidatePath(`/app/${condominiumId}/residents/${profileId}`);
  return { success: true, message: "Perfil actualizado." };
}

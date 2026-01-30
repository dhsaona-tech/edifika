"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getUser";
import { UnitSummary, Unit, Condominium } from "@/types";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ==========================================
// FUNCIONES DE LECTURA
// ==========================================

export async function getUnits(condominiumId: string, query?: string, typeFilter?: string) {
  const supabase = await createClient();
  
  let dbQuery = supabase
    .from("view_unit_summary")
    .select("*")
    .eq("condominium_id", condominiumId)
    .order("identifier", { ascending: true });

  if (query) {
    dbQuery = dbQuery.or(`full_identifier.ilike.%${query}%,primary_owner_name.ilike.%${query}%`);
  }

  if (typeFilter && typeFilter !== 'todos') {
    dbQuery = dbQuery.eq("type", typeFilter);
  }

  const { data, error } = await dbQuery;
  if (error) return [];
  
  const units = (data as UnitSummary[]) || [];
  const unitIds = units.map((u) => u.id);
  if (unitIds.length === 0) return units;

  const [charges, contacts] = await Promise.all([
    supabase
      .from("charges")
      .select("unit_id, balance, status")
      .eq("condominium_id", condominiumId)
      .in("unit_id", unitIds)
      .neq("status", "cancelado"),
    supabase
      .from("unit_contacts")
      .select(`
        unit_id,
        relationship_type,
        is_primary_contact,
        profile:profiles!inner(id, full_name, first_name, last_name)
      `)
      .in("unit_id", unitIds)
      .is("end_date", null)
  ]);

  const debtMap = new Map<string, { pending: number; total: number }>();
  (charges.data || []).forEach((c: any) => {
    const prev = debtMap.get(c.unit_id) || { pending: 0, total: 0 };
    const balance = Number(c.balance || 0);
    prev.total += balance;
    if (c.status === "pendiente") prev.pending += balance;
    debtMap.set(c.unit_id, prev);
  });

  const contactsMap = new Map<string, Array<{
    id: string;
    full_name: string;
    relationship_type: string;
    is_primary_contact: boolean;
  }>>();

  (contacts.data || []).forEach((c: any) => {
    const unitId = c.unit_id;
    const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile;
    
    if (!contactsMap.has(unitId)) contactsMap.set(unitId, []);
    
    contactsMap.get(unitId)!.push({
      id: profile?.id || "",
      full_name: profile?.full_name || "Sin nombre",
      relationship_type: c.relationship_type,
      is_primary_contact: c.is_primary_contact || false,
    });
  });

  return units.map((u) => {
    const debt = debtMap.get(u.id) || { pending: 0, total: 0 };
    const unitContacts = contactsMap.get(u.id) || [];
    const owners = unitContacts.filter(c => c.relationship_type === "OWNER");
    const tenants = unitContacts.filter(c => c.relationship_type === "TENANT");
    
    return {
      ...u,
      pending_balance: debt.pending,
      total_balance: debt.total,
      debt_status: (debt.pending > 0 ? "pendiente" : "al_dia") as "pendiente" | "al_dia",
      contacts: unitContacts,
      owners_count: owners.length,
      tenants_count: tenants.length,
      owners,
      tenants,
    };
  });
}

export async function getCondoTotalAliquot(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("view_condo_aliquot_total")
    .select("total_aliquot")
    .eq("condominium_id", condominiumId)
    .single();
  
  if (error || !data) return 0;
  return Number(data.total_aliquot) || 0;
}

export async function getCondominiumConfig(id: string): Promise<Pick<Condominium, 'use_blocks' | 'developer_profile_id'> | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("condominiums")
    .select("use_blocks, developer_profile_id")
    .eq("id", id)
    .single();
  return data;
}

export async function getUnitById(unitId: string) {
  const supabase = await createClient();
  
  const { data: unitData, error } = await supabase
    .from("units")
    .select(`*, condominium:condominiums!inner(id, name)`)
    .eq("id", unitId)
    .single();

  if (error || !unitData) return null;

  const { data: contacts } = await supabase
    .from("unit_contacts")
    .select(`
      id, 
      is_primary_contact, 
      is_current_occupant, 
      relationship_type,
      end_date,
      profile:profiles!inner(
        id,
        full_name, 
        first_name, 
        last_name,
        email,
        phone,
        national_id,
        avatar_url
      )
    `)
    .eq("unit_id", unitId)
    .order("is_primary_contact", { ascending: false })
    .order("start_date", { ascending: false });

  const safeContacts = (contacts || []) as any[];
  const primaryContact = safeContacts.find(c => c.is_primary_contact && !c.end_date);
  const fallbackOwner = safeContacts.find(c => c.relationship_type === 'OWNER' && !c.end_date);
  
  const contactForName = primaryContact || fallbackOwner;
  const primaryPayerProfile = contactForName 
    ? (Array.isArray(contactForName.profile) ? contactForName.profile[0] : contactForName.profile)
    : null;

  const primaryOwnerName = primaryPayerProfile?.full_name || "Sin asignar";

  const occupantsList = safeContacts
    .filter(c => c.is_current_occupant && !c.end_date)
    .map(c => {
      const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile;
      return profile?.full_name || "Sin nombre";
    })
    .filter(n => n)
    .join(", ");

  return {
    ...unitData,
    primary_owner_name: primaryOwnerName,
    primary_payer_profile: primaryPayerProfile,
    current_occupant_name: occupantsList || null,
    payer_contact_id: contactForName?.id || null,
  } as UnitSummary & { 
    payer_contact_id?: string | null;
    primary_payer_profile?: {
      id: string;
      full_name: string;
      email?: string | null;
      phone?: string | null;
      national_id?: string | null;
      avatar_url?: string | null;
    } | null;
  };
}

export async function getSubUnits(condominiumId: string, parentUnitId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .select("*")
    .eq("condominium_id", condominiumId)
    .eq("parent_unit_id", parentUnitId)
    .eq("status", "activa");
  if (error) return [];
  return data as Unit[];
}

export async function getAvailableAccessories(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .select("*")
    .eq("condominium_id", condominiumId)
    .is("parent_unit_id", null) 
    .in("type", ["parqueadero", "bodega", "suite_adicional"]) 
    .eq("status", "activa")
    .order("identifier", { ascending: true });

  if (error) return [];
  return data as Unit[];
}

export async function getUnitContacts(unitId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("unit_contacts")
    .select(`
      *,
      profile:profiles (
        full_name,
        national_id,
        avatar_url,
        email,
        phone
      )
    `)
    .eq("unit_id", unitId)
    .order("is_current_occupant", { ascending: false })
    .order("start_date", { ascending: false });
  if (error) return [];
  return data;
}

// ==========================================
// FUNCIONES DE ESCRITURA
// ==========================================

export async function setPrimaryPayer(condominiumId: string, unitId: string, contactId: string) {
  const supabase = await createClient();
  
  await supabase
    .from("unit_contacts")
    .update({ is_primary_contact: false })
    .eq("unit_id", unitId);

  const { error } = await supabase
    .from("unit_contacts")
    .update({ is_primary_contact: true, receives_debt_emails: true })
    .eq("id", contactId);

  if (error) return { error: "Error al asignar pagador." };
  
  revalidatePath(`/app/${condominiumId}/units/${unitId}`);
  return { success: true };
}

export async function toggleDebtEmail(condominiumId: string, unitId: string, contactId: string, receivesEmails: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("unit_contacts")
    .update({ receives_debt_emails: receivesEmails })
    .eq("id", contactId);

  if (error) return { error: "Error al actualizar preferencias." };
  revalidatePath(`/app/${condominiumId}/units/${unitId}`);
  return { success: true };
}

export async function toggleOccupancy(condominiumId: string, unitId: string, contactId: string, isOccupant: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("unit_contacts")
    .update({ is_current_occupant: isOccupant })
    .eq("id", contactId);

  if (error) return { error: "Error al actualizar ocupación." };
  revalidatePath(`/app/${condominiumId}/units/${unitId}`);
  return { success: true };
}

export async function updateCondoBlocksConfig(condominiumId: string, useBlocks: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("condominiums").update({ use_blocks: useBlocks }).eq("id", condominiumId);
  if (error) throw new Error("Error al guardar configuración.");
  revalidatePath(`/app/${condominiumId}/units/new`);
}

const CreateUnitSchema = z.object({
  identifier: z.string().min(1, "Identificador obligatorio"),
  type: z.string().min(1, "Tipo obligatorio"),
  aliquot: z.coerce.number().min(0).max(100),
  area: z.coerce.number().optional(),
  block_identifier: z.string().nullable().optional(),
  initial_owner_type: z.enum(["DEVELOPER", "OWNER"]),
  is_quick_owner: z.preprocess(val => val === 'true', z.boolean()),
  owner_name: z.any(),
  owner_lastname: z.any(),
  owner_national_id: z.any(),
  owner_email: z.any(),
  owner_doc_type: z.string().optional(),
  initial_balance: z.coerce.number(),
});

export async function createUnit(condominiumId: string, formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Debes iniciar sesión." };

  const rawData = {
    identifier: formData.get("identifier"),
    type: formData.get("type"),
    aliquot: formData.get("aliquot"),
    area: formData.get("area"),
    block_identifier: formData.get("block_identifier"),
    initial_owner_type: formData.get("initial_owner_type"),
    is_quick_owner: formData.get("is_quick_owner"),
    owner_name: formData.get("owner_name"),
    owner_lastname: formData.get("owner_lastname"),
    owner_national_id: formData.get("owner_national_id"),
    owner_email: formData.get("owner_email"),
    owner_doc_type: formData.get("owner_doc_type"),
    initial_balance: formData.get("initial_balance"),
  };

  const result = CreateUnitSchema.safeParse(rawData);
  if (!result.success) return { error: "Error validación." };
  const data = result.data;

  let final_profile_id = user.id;
  let final_relationship_type = data.initial_owner_type;

  if (data.is_quick_owner && data.initial_owner_type === 'OWNER' && data.owner_name) {
    const { data: existing } = await supabase.from("profiles")
        .select("id")
        .or(`national_id.eq.${data.owner_national_id},email.eq.${data.owner_email}`)
        .maybeSingle();

    if (existing) {
        final_profile_id = existing.id;
    } else {
        const newProfileId = crypto.randomUUID();
        await supabase.from("profiles").insert({
            id: newProfileId,
            full_name: `${data.owner_name} ${data.owner_lastname}`,
            first_name: data.owner_name,
            last_name: data.owner_lastname,
            national_id: data.owner_national_id,
            id_type: data.owner_doc_type || null,
            email: data.owner_email || null,
            contact_preference: 'Correo'
        });
        final_profile_id = newProfileId;
    }
    await supabase.from("memberships").upsert({ condominium_id: condominiumId, profile_id: final_profile_id, role: 'RESIDENT', status: 'activo' }, { onConflict: 'condominium_id, profile_id' });
  }

  const blockPrefix = data.block_identifier ? `${data.block_identifier} – ` : '';
  const fullIdentifier = `${blockPrefix}${data.type} ${data.identifier}`;

  const { data: unitData, error: unitError } = await supabase.from("units").insert({
      condominium_id: condominiumId,
      identifier: data.identifier,
      block_identifier: data.block_identifier || null,
      full_identifier: fullIdentifier,
      type: data.type,
      aliquot: data.aliquot,
      area: data.area || 0,
      status: "activa"
  }).select().single();

  if (unitError || !unitData) return { error: "Error creando unidad." };

  await supabase.from("unit_contacts").insert({
      unit_id: unitData.id,
      profile_id: final_profile_id,
      relationship_type: final_relationship_type,
      is_primary_contact: true,
      is_current_occupant: (final_relationship_type === 'OWNER' && data.is_quick_owner),
      receives_debt_emails: true,
      start_date: new Date().toISOString(),
      ownership_share: 100.00
  });

  const initialBalance = Number(data.initial_balance || 0);
  if (initialBalance !== 0) {
    const { data: saldoInicialRubro } = await supabase
      .from("expense_items")
      .select("id")
      .eq("condominium_id", condominiumId)
      .eq("name", "Saldo Inicial")
      .maybeSingle();

    let expenseItemId: string | null = null;
    if (saldoInicialRubro) {
      expenseItemId = saldoInicialRubro.id;
    } else {
      const { data: newRubro, error: rubroError } = await supabase
        .from("expense_items")
        .insert({
          condominium_id: condominiumId,
          name: "Saldo Inicial",
          description: "Saldo pendiente al momento de crear la unidad",
          category: "otros",
          is_income: false,
        })
        .select()
        .single();

      if (rubroError || !newRubro) {
        console.error("Error creando rubro Saldo Inicial", rubroError);
      } else {
        expenseItemId = newRubro.id;
      }
    }

    if (expenseItemId) {
      const today = new Date().toISOString().split("T")[0];
      const description = initialBalance > 0 
        ? `Deuda inicial al crear la unidad (${today})`
        : `Saldo a favor inicial al crear la unidad (${today})`;

      await supabase.from("charges").insert({
        condominium_id: condominiumId,
        unit_id: unitData.id,
        expense_item_id: expenseItemId,
        utility_bill_id: null,
        period: null,
        posted_date: today,
        due_date: today,
        total_amount: Math.abs(initialBalance),
        paid_amount: 0,
        balance: Math.abs(initialBalance),
        status: "pendiente",
        charge_type: initialBalance > 0 ? "ordinaria" : "otro",
        description: description,
        batch_id: null,
      });
    }
  }

  revalidatePath(`/app/${condominiumId}/units`);
  redirect(`/app/${condominiumId}/units/${unitData.id}`);
}

export async function updateUnit(unitId: string, condominiumId: string, formData: FormData) {
  const supabase = await createClient();
  const rawData = {
    identifier: formData.get("identifier"),
    type: formData.get("type"),
    block_identifier: formData.get("block_identifier"),
    area: formData.get("area"),
    aliquot: formData.get("aliquot"),
  };
  const data = rawData as any; 
  const blockPrefix = data.block_identifier ? `${data.block_identifier} – ` : '';
  const fullIdentifier = `${blockPrefix}${data.type} ${data.identifier}`;

  const { error } = await supabase.from("units").update({
      identifier: data.identifier, type: data.type, block_identifier: data.block_identifier || null,
      full_identifier: fullIdentifier, area: data.area || 0, aliquot: data.aliquot
  }).eq("id", unitId).eq("condominium_id", condominiumId);

  if (error) {
    console.error("Error actualizando unidad", error);
    return { error: "No se pudo actualizar la unidad" };
  }

  revalidatePath(`/app/${condominiumId}/units/${unitId}`);
  revalidatePath(`/app/${condominiumId}/units`);
  return { success: true };
}

export async function registerNewTenant(condominiumId: string, unitId: string, formData: FormData) {
    const supabase = await createClient();
    const first_name = formData.get("first_name") as string;
    const last_name = formData.get("last_name") as string;
    const national_id = formData.get("national_id") as string;
    const email = formData.get("email") as string;
    const start_date = formData.get("start_date") as string;
    const receives_emails = formData.get("receives_emails") === 'on';

    let profileId = "";

    const { data: existing } = await supabase.from("profiles")
        .select("id")
        .or(`national_id.eq.${national_id},email.eq.${email}`)
        .maybeSingle();

    if (existing) {
        profileId = existing.id;
    } else {
        const newId = crypto.randomUUID();
        const { error } = await supabase.from("profiles").insert({
            id: newId, full_name: `${first_name} ${last_name}`, first_name, last_name, national_id, email, contact_preference: 'Correo'
        });
        if (error) return { error: "Error creando perfil (posible duplicado)." };
        profileId = newId;
    }

    await supabase.from("memberships").upsert({
        condominium_id: condominiumId, profile_id: profileId, role: 'RESIDENT', status: 'activo'
    }, { onConflict: 'condominium_id, profile_id' });

    await supabase.from("unit_contacts").update({ is_primary_contact: false }).eq("unit_id", unitId);

    await supabase.from("unit_contacts").insert({
        unit_id: unitId,
        profile_id: profileId,
        relationship_type: 'TENANT',
        is_primary_contact: true,
        is_current_occupant: true,
        start_date: start_date,
        receives_debt_emails: receives_emails,
        ownership_share: 0
    });

    revalidatePath(`/app/${condominiumId}/units/${unitId}`);
    redirect(`/app/${condominiumId}/units/${unitId}`);
}

export async function unassignAccessory(condominiumId: string, parentUnitId: string, accessoryUnitId: string) {
  const supabase = await createClient();
  await supabase.from("units").update({ parent_unit_id: null }).eq("id", accessoryUnitId);
  revalidatePath(`/app/${condominiumId}/units/${parentUnitId}`);
}

export async function assignAccessory(condominiumId: string, parentUnitId: string, accessoryUnitId: string) {
  const supabase = await createClient();
  await supabase.from("units").update({ parent_unit_id: parentUnitId }).eq("id", accessoryUnitId);
  revalidatePath(`/app/${condominiumId}/units/${parentUnitId}`);
  redirect(`/app/${condominiumId}/units/${parentUnitId}`);
}

export async function registerSale(condominiumId: string, unitId: string, formData: FormData) {
  const supabase = await createClient();
  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  const national_id = formData.get("national_id") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const start_date = formData.get("start_date") as string;
  const is_occupant = formData.get("is_occupant") === 'on';
  const notes = formData.get("notes") as string;

  let profileId = "";

  const { data: existing } = await supabase.from("profiles")
      .select("id")
      .or(`national_id.eq.${national_id},email.eq.${email}`)
      .maybeSingle();

  if (existing) {
      profileId = existing.id;
  } else {
      const newId = crypto.randomUUID();
      const { error } = await supabase.from("profiles").insert({
          id: newId, full_name: `${first_name} ${last_name}`, first_name, last_name, national_id, email, phone, notes, contact_preference: 'Correo'
      });
      if (error) return { error: "Error creando perfil." };
      profileId = newId;
  }

  await supabase.from("memberships").upsert({
      condominium_id: condominiumId, profile_id: profileId, role: 'RESIDENT', status: 'activo'
  }, { onConflict: 'condominium_id, profile_id' });

  await supabase.from("unit_contacts")
      .update({ end_date: start_date, is_current_occupant: false, is_primary_contact: false })
      .eq("unit_id", unitId)
      .eq("relationship_type", "OWNER")
      .is("end_date", null);

  await supabase.from("unit_contacts").update({ is_primary_contact: false }).eq("unit_id", unitId);

  await supabase.from("unit_contacts").insert({
      unit_id: unitId,
      profile_id: profileId,
      relationship_type: 'OWNER',
      is_primary_contact: true,
      is_current_occupant: is_occupant,
      start_date: start_date,
      receives_debt_emails: true,
      ownership_share: 100.00
  });

  revalidatePath(`/app/${condominiumId}/units/${unitId}`);
  redirect(`/app/${condominiumId}/units/${unitId}`);
}

export async function endContactRelationship(condominiumId: string, unitId: string, contactId: string) {
    const supabase = await createClient();
    
    const { data: contactLeaving } = await supabase.from("unit_contacts").select("is_primary_contact").eq("id", contactId).single();
    const wasPrimary = contactLeaving?.is_primary_contact;

    await supabase.from("unit_contacts")
        .update({ end_date: new Date().toISOString(), is_current_occupant: false, is_primary_contact: false })
        .eq("id", contactId);

    if (wasPrimary) {
        const { data: owner } = await supabase.from("unit_contacts")
            .select("id")
            .eq("unit_id", unitId)
            .eq("relationship_type", "OWNER")
            .is("end_date", null)
            .neq("id", contactId)
            .limit(1)
            .maybeSingle();
        
        if (owner) {
            await supabase.from("unit_contacts").update({ is_primary_contact: true }).eq("id", owner.id);
        }
    }

    revalidatePath(`/app/${condominiumId}/units/${unitId}`);
}

export async function getActiveBudgetInfo(condominiumId: string) {
  const supabase = await createClient();

  const { data: condo, error: condoError } = await supabase
    .from("condominiums")
    .select("active_budget_master_id")
    .eq("id", condominiumId)
    .single();

  if (condoError || !condo?.active_budget_master_id) return null;

  const budgetId = condo.active_budget_master_id;

  const { data: budget, error } = await supabase
    .from("budgets_master")
    .select("id, total_annual_amount, distribution_method, budget_type")
    .eq("id", budgetId)
    .single();

  if (error || !budget) return null;

  return {
    id: budget.id,
    total_annual_amount: Number(budget.total_annual_amount || 0),
    distribution_method: (budget.distribution_method as string) || "por_aliquota",
    budget_type: budget.budget_type as string,
  };
}

export async function getActiveUnitsCount(condominiumId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("units")
    .select("*", { count: "exact", head: true })
    .eq("condominium_id", condominiumId)
    .eq("status", "activa");

  if (error) return 0;
  return count || 0;
}

export async function getUnitChargesSummary(condominiumId: string, unitId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("charges")
    .select("total_amount, balance, status")
    .eq("condominium_id", condominiumId)
    .eq("unit_id", unitId)
    .neq("status", "cancelado");

  if (error || !data) {
    return { totalGenerado: 0, saldoPendiente: 0, totalCargos: 0 };
  }

  const totalGenerado = data.reduce((sum, c: any) => sum + Number(c.total_amount || 0), 0);
  const saldoPendiente = data
    .filter((c: any) => c.status === "pendiente")
    .reduce((sum, c: any) => sum + Number(c.balance || 0), 0);

  return { totalGenerado, saldoPendiente, totalCargos: data.length };
}
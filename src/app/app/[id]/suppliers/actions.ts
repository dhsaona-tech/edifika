"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ==========================================
// 1. VALIDACIONES (ZOD SCHEMAS)
// ==========================================

const SupplierSchema = z
  .object({
    supplier_type: z.string().min(1, "El tipo de proveedor es obligatorio"),
    fiscal_id: z.string().min(1, "La identificacion (RUC/Cedula) es obligatoria"),
    name: z.string().min(1, "El nombre o razon social es obligatorio"),
    id_type_ui: z.string().optional().or(z.literal("")),
    commercial_name: z.string().optional().or(z.literal("")),

    // Contacto (validacion condicional abajo)
    email: z.string().email("Email invalido").optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    contact_person: z.string().min(1, "La persona de contacto es obligatoria"),
    address: z.string().optional().or(z.literal("")),

    // Financiero
    bank_name: z.string().optional().or(z.literal("")),
    bank_account_number: z.string().optional().or(z.literal("")),
    default_expense_item_id: z.string().optional().or(z.literal("")),

    // Estado
    is_active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    // REGLA DE NEGOCIO: contacto minimo (email o telefono)
    const hasEmail = data.email && data.email !== "";
    const hasPhone = data.phone && data.phone !== "";

    if (!hasEmail && !hasPhone) {
      const msg = "Ingresa un email o un telefono (solo uno es requerido).";
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["email"] });
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["phone"] });
    }

    if (hasEmail && hasPhone) {
      const msg = "Solo ingresa un medio de contacto: email o telefono, no ambos.";
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["email"] });
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["phone"] });
    }

    // Validacion por tipo de identificacion (solo UI)
    const idType = (data.id_type_ui || "").toUpperCase();
    const fiscal = (data.fiscal_id || "").trim();
    if (idType === "RUC" && fiscal && fiscal.length !== 13) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El RUC debe tener 13 digitos.",
        path: ["fiscal_id"],
      });
    }
    if (idType === "CEDULA" && fiscal && fiscal.length !== 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cedula debe tener 10 digitos.",
        path: ["fiscal_id"],
      });
    }
    if (idType === "PASAPORTE" && fiscal && fiscal.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El pasaporte debe tener al menos 6 caracteres.",
        path: ["fiscal_id"],
      });
    }
  });

// ==========================================
// 2. LECTURA (GETTERS)
// ==========================================

export async function getSuppliers(
  condominiumId: string,
  query?: string,
  activeFilter?: string,
  expenseItemIdFilter?: string,
  fiscalIdFilter?: string
) {
  const supabase = await createClient();

  let dbQuery = supabase
    .from("suppliers")
    .select(
      `
      *,
      expense_item:expense_items(id, name)
    `
    )
    .eq("condominium_id", condominiumId)
    .order("name", { ascending: true });

  // Filtro de busqueda
  if (query) {
    dbQuery = dbQuery.or(
      `name.ilike.%${query}%,commercial_name.ilike.%${query}%,fiscal_id.ilike.%${query}%`
    );
  }

  // Filtro de estado (Activo/Inactivo)
  if (activeFilter === "active") {
    dbQuery = dbQuery.eq("is_active", true);
  } else if (activeFilter === "inactive") {
    dbQuery = dbQuery.eq("is_active", false);
  }

  // Filtro por rubro principal
  if (expenseItemIdFilter) {
    dbQuery = dbQuery.eq("default_expense_item_id", expenseItemIdFilter);
  }

  // Filtro por identificacion exacta
  if (fiscalIdFilter) {
    dbQuery = dbQuery.eq("fiscal_id", fiscalIdFilter);
  }

  const { data, error } = await dbQuery;

  if (error) {
    // Log detallado para depurar sin romper la UI
    console.error("Error fetching suppliers:", {
      message: error.message,
      details: error.details,
      hint: (error as any).hint,
      code: error.code,
    });
    return [];
  }
  return data || [];
}

export async function getSupplierById(supplierId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplierId)
    .single();

  if (error) return null;
  return data;
}

// Para llenar el select de "Rubro Principal"
export async function getExpenseItems(condominiumId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expense_items")
    .select("id, name")
    .eq("condominium_id", condominiumId)
    .eq("is_active", true)
    .order("name");

  return data || [];
}

// ==========================================
// 3. ESCRITURA (MUTATIONS)
// ==========================================

export async function createSupplier(condominiumId: string, formData: FormData) {
  const supabase = await createClient();

  // 1. Sanitizacion basica
  const rawData = {
    supplier_type: formData.get("supplier_type"),
    id_type_ui: formData.get("id_type_ui"),
    fiscal_id: formData.get("fiscal_id"),
    name: formData.get("name"),
    commercial_name: formData.get("commercial_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    contact_person: formData.get("contact_person"),
    address: formData.get("address"),
    bank_name: formData.get("bank_name"),
    bank_account_number: formData.get("bank_account_number"),
    default_expense_item_id: formData.get("default_expense_item_id"),
    is_active: formData.get("is_active") === "on",
  };

  // 2. Validacion Zod
  // Normalizar strings
  const normalize = (val: FormDataEntryValue | null) =>
    typeof val === "string" ? val.trim() : val;

  const normalizedData = {
    ...rawData,
    fiscal_id: normalize(rawData.fiscal_id)?.toString().toUpperCase() || "",
    name: normalize(rawData.name)?.toString() || "",
    commercial_name: normalize(rawData.commercial_name)?.toString() || "",
    email: normalize(rawData.email)?.toString() || "",
    phone: normalize(rawData.phone)?.toString() || "",
    contact_person: normalize(rawData.contact_person)?.toString() || "",
    address: normalize(rawData.address)?.toString() || "",
    bank_name: normalize(rawData.bank_name)?.toString() || "",
    bank_account_number: normalize(rawData.bank_account_number)?.toString() || "",
    default_expense_item_id: normalize(rawData.default_expense_item_id)?.toString() || "",
    id_type_ui: normalize(rawData.id_type_ui)?.toString() || "",
  };

  const result = SupplierSchema.safeParse(normalizedData);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  const data = result.data;

  // Reglas adicionales: si hay cuenta bancaria, se recomienda banco (bloqueamos si falta banco)
  if (data.bank_account_number && !data.bank_name) {
    return { error: "Si ingresas numero de cuenta, indica tambien el banco." };
  }

  // 3. REGLA DE NEGOCIO: unicidad de identificacion en el condominio (solo activos)
  const { data: existing } = await supabase
    .from("suppliers")
    .select("id")
    .eq("condominium_id", condominiumId)
    .eq("is_active", true)
    .eq("fiscal_id", data.fiscal_id)
    .maybeSingle();

  if (existing) {
    return { error: `Ya existe un proveedor activo con la identificacion ${data.fiscal_id} en este condominio.` };
  }

  // 4. Insertar (sin enviar id_type_ui porque es solo para UI/validacion)
  const { id_type_ui: _idTypeUi, default_expense_item_id, ...dbData } = data;
  const { error } = await supabase.from("suppliers").insert({
    condominium_id: condominiumId,
    ...dbData,
    default_expense_item_id: default_expense_item_id || null, // Manejo de UUID vacio
  });

  if (error) {
    console.error("Create Supplier Error:", error);
    return { error: "Error al guardar el proveedor." };
  }

  revalidatePath(`/app/${condominiumId}/suppliers`);
  return { success: true };
}

export async function updateSupplier(condominiumId: string, supplierId: string, formData: FormData) {
  const supabase = await createClient();

  const rawData = {
    supplier_type: formData.get("supplier_type"),
    id_type_ui: formData.get("id_type_ui"),
    fiscal_id: formData.get("fiscal_id"),
    name: formData.get("name"),
    commercial_name: formData.get("commercial_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    contact_person: formData.get("contact_person"),
    address: formData.get("address"),
    bank_name: formData.get("bank_name"),
    bank_account_number: formData.get("bank_account_number"),
    default_expense_item_id: formData.get("default_expense_item_id"),
    is_active: formData.get("is_active") === "on",
  };

  const normalize = (val: FormDataEntryValue | null) =>
    typeof val === "string" ? val.trim() : val;

  const normalizedData = {
    ...rawData,
    fiscal_id: normalize(rawData.fiscal_id)?.toString().toUpperCase() || "",
    name: normalize(rawData.name)?.toString() || "",
    commercial_name: normalize(rawData.commercial_name)?.toString() || "",
    email: normalize(rawData.email)?.toString() || "",
    phone: normalize(rawData.phone)?.toString() || "",
    contact_person: normalize(rawData.contact_person)?.toString() || "",
    address: normalize(rawData.address)?.toString() || "",
    bank_name: normalize(rawData.bank_name)?.toString() || "",
    bank_account_number: normalize(rawData.bank_account_number)?.toString() || "",
    default_expense_item_id: normalize(rawData.default_expense_item_id)?.toString() || "",
    id_type_ui: normalize(rawData.id_type_ui)?.toString() || "",
  };

  const result = SupplierSchema.safeParse(normalizedData);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  const data = result.data;

  if (data.bank_account_number && !data.bank_name) {
    return { error: "Si ingresas numero de cuenta, indica tambien el banco." };
  }

  // Verificar duplicados (excluyendo al actual) solo entre activos
  const { data: existing } = await supabase
    .from("suppliers")
    .select("id")
    .eq("condominium_id", condominiumId)
    .eq("fiscal_id", data.fiscal_id)
    .eq("is_active", true)
    .neq("id", supplierId)
    .maybeSingle();

  if (existing) {
    return { error: `Otro proveedor activo ya usa la identificacion ${data.fiscal_id}.` };
  }

  const { id_type_ui: _idTypeUi, default_expense_item_id, ...dbData } = data;
  const { error } = await supabase
    .from("suppliers")
    .update({
      ...dbData,
      default_expense_item_id: default_expense_item_id || null,
    })
    .eq("id", supplierId);

  if (error) return { error: "Error al actualizar." };

  revalidatePath(`/app/${condominiumId}/suppliers`);
  revalidatePath(`/app/${condominiumId}/suppliers/${supplierId}`);
  return { success: true };
}

export async function toggleSupplierStatus(condominiumId: string, supplierId: string, newStatus: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("suppliers")
    .update({ is_active: newStatus })
    .eq("id", supplierId);

  if (error) {
    console.error("Error toggling supplier status:", {
      message: error.message,
      details: error.details,
      hint: (error as any).hint,
      code: error.code,
    });
    return { error: error.message || "Error al cambiar estado." };
  }

  revalidatePath(`/app/${condominiumId}/suppliers`);
  return { success: true };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CondominiumBillingSettings, BillingSettingsFormData } from "@/types/billing";

const BillingSettingsSchema = z.object({
  early_payment_enabled: z.boolean().default(false),
  early_payment_type: z.enum(["porcentaje", "monto_fijo"]).nullable().optional(),
  early_payment_value: z.coerce.number().min(0).default(0),
  early_payment_cutoff_day: z.coerce.number().int().min(1).max(28).nullable().optional(),

  late_fee_enabled: z.boolean().default(false),
  late_fee_type: z.enum(["porcentaje", "monto_fijo"]).nullable().optional(),
  late_fee_value: z.coerce.number().min(0).default(0),
  late_fee_grace_days: z.coerce.number().int().min(0).default(0),
  late_fee_apply_on: z.enum(["balance", "total"]).default("balance"),
  late_fee_max_rate: z.coerce.number().min(0).nullable().optional(),
  late_fee_compound: z.boolean().default(false),

  default_due_day: z.coerce.number().int().min(1).max(28).default(15),
  auto_generate_charges: z.boolean().default(false),
});

export async function getBillingSettings(
  condominiumId: string
): Promise<CondominiumBillingSettings | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("condominium_billing_settings")
    .select("*")
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo configuración de facturación", error);
    return null;
  }

  return data;
}

export async function saveBillingSettings(
  condominiumId: string,
  formData: BillingSettingsFormData
) {
  const parsed = BillingSettingsSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  // Validaciones de negocio
  if (data.early_payment_enabled) {
    if (!data.early_payment_type) {
      return { error: "Selecciona el tipo de descuento por pronto pago" };
    }
    if (data.early_payment_value <= 0) {
      return { error: "El valor del descuento debe ser mayor a 0" };
    }
    if (!data.early_payment_cutoff_day) {
      return { error: "Selecciona el día límite para pronto pago" };
    }
  }

  if (data.late_fee_enabled) {
    if (!data.late_fee_type) {
      return { error: "Selecciona el tipo de mora" };
    }
    if (data.late_fee_value <= 0) {
      return { error: "El valor de la mora debe ser mayor a 0" };
    }
  }

  const supabase = await createClient();

  // Verificar si ya existe configuración
  const { data: existing } = await supabase
    .from("condominium_billing_settings")
    .select("id")
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  const payload = {
    condominium_id: condominiumId,
    early_payment_enabled: data.early_payment_enabled,
    early_payment_type: data.early_payment_enabled ? data.early_payment_type : null,
    early_payment_value: data.early_payment_enabled ? data.early_payment_value : 0,
    early_payment_cutoff_day: data.early_payment_enabled ? data.early_payment_cutoff_day : null,
    late_fee_enabled: data.late_fee_enabled,
    late_fee_type: data.late_fee_enabled ? data.late_fee_type : null,
    late_fee_value: data.late_fee_enabled ? data.late_fee_value : 0,
    late_fee_grace_days: data.late_fee_grace_days,
    late_fee_apply_on: data.late_fee_apply_on,
    late_fee_max_rate: data.late_fee_max_rate || null,
    late_fee_compound: data.late_fee_compound,
    default_due_day: data.default_due_day,
    auto_generate_charges: data.auto_generate_charges,
  };

  if (existing) {
    const { error } = await supabase
      .from("condominium_billing_settings")
      .update(payload)
      .eq("id", existing.id)
      .eq("condominium_id", condominiumId);

    if (error) {
      console.error("Error actualizando configuración", error);
      return { error: "No se pudo guardar la configuración" };
    }
  } else {
    const { error } = await supabase
      .from("condominium_billing_settings")
      .insert(payload);

    if (error) {
      console.error("Error creando configuración", error);
      return { error: "No se pudo crear la configuración" };
    }
  }

  revalidatePath(`/app/${condominiumId}/billing-settings`);
  revalidatePath(`/app/${condominiumId}/my-condo`);
  return { success: true };
}

// Función para generar cargos de mora manualmente
export async function generateLateFeeCharges(condominiumId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("generate_late_fee_charges", {
    p_condominium_id: condominiumId,
    p_as_of_date: new Date().toISOString().split("T")[0],
  });

  if (error) {
    console.error("Error generando cargos de mora", error);
    return { error: "No se pudieron generar los cargos de mora" };
  }

  revalidatePath(`/app/${condominiumId}/charges`);

  return {
    success: true,
    charges_created: data?.[0]?.charges_created || 0,
    total_late_fees: data?.[0]?.total_late_fees || 0,
  };
}

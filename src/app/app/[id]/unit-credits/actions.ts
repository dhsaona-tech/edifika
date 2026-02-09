"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { UnitCredit, UnitCreditMovementType } from "@/types/billing";

const AdjustmentSchema = z.object({
  unit_id: z.string().uuid("Selecciona una unidad"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  movement_type: z.enum(["credit_in", "adjustment"]),
  description: z.string().min(1, "La descripcion es obligatoria"),
  notes: z.string().optional(),
});

export async function getUnitCredits(
  condominiumId: string,
  unitId?: string
): Promise<UnitCredit[]> {
  const supabase = await createClient();

  let query = supabase
    .from("unit_credits")
    .select(
      `*,
      payment:payments(folio_rec),
      charge:charges(description)`
    )
    .eq("condominium_id", condominiumId)
    .order("created_at", { ascending: false });

  if (unitId) {
    query = query.eq("unit_id", unitId);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    console.error("Error listando creditos", error);
    return [];
  }

  return data || [];
}

export async function getUnitCreditBalance(
  condominiumId: string,
  unitId: string
): Promise<number> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("units")
    .select("credit_balance")
    .eq("id", unitId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  return Number(data?.credit_balance || 0);
}

export async function getUnitsWithCredit(condominiumId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("units")
    .select("id, identifier, full_identifier, credit_balance")
    .eq("condominium_id", condominiumId)
    .gt("credit_balance", 0.01)
    .order("credit_balance", { ascending: false });

  if (error) {
    console.error("Error obteniendo unidades con credito", error);
    return [];
  }

  return data || [];
}

export async function registerCreditAdjustment(
  condominiumId: string,
  formData: {
    unit_id: string;
    amount: number;
    movement_type: "credit_in" | "adjustment";
    description: string;
    notes?: string;
  }
) {
  const parsed = AdjustmentSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const supabase = await createClient();

  // Verificar que la unidad pertenece al condominio
  const { data: unit } = await supabase
    .from("units")
    .select("id")
    .eq("id", data.unit_id)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  if (!unit) {
    return { error: "Unidad no encontrada" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El trigger update_unit_credit_balance() se encargara de actualizar running_balance y units.credit_balance
  const { error } = await supabase.from("unit_credits").insert({
    condominium_id: condominiumId,
    unit_id: data.unit_id,
    movement_type: data.movement_type,
    amount: data.amount, // Siempre positivo para credit_in/adjustment positivo
    running_balance: 0, // Se calcula en el trigger
    description: data.description,
    notes: data.notes || null,
    created_by: user?.id || null,
  });

  if (error) {
    console.error("Error registrando ajuste", error);
    return { error: "No se pudo registrar el ajuste" };
  }

  revalidatePath(`/app/${condominiumId}/unit-credits`);
  revalidatePath(`/app/${condominiumId}/units/${data.unit_id}`);

  return { success: true };
}

export async function applyCreditToCharge(
  condominiumId: string,
  unitId: string,
  chargeId: string,
  amount: number
) {
  const supabase = await createClient();

  // Verificar saldo disponible
  const currentBalance = await getUnitCreditBalance(condominiumId, unitId);
  if (currentBalance < amount - 0.01) {
    return { error: "Saldo a favor insuficiente" };
  }

  // Verificar cargo
  const { data: charge } = await supabase
    .from("charges")
    .select("id, balance, status")
    .eq("id", chargeId)
    .eq("condominium_id", condominiumId)
    .eq("unit_id", unitId)
    .maybeSingle();

  if (!charge) {
    return { error: "Cargo no encontrado" };
  }

  if (charge.status !== "pendiente") {
    return { error: "El cargo no esta pendiente" };
  }

  if (charge.balance < amount - 0.01) {
    return { error: "El monto excede el saldo del cargo" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Registrar uso de credito (monto negativo)
  const { error: creditError } = await supabase.from("unit_credits").insert({
    condominium_id: condominiumId,
    unit_id: unitId,
    movement_type: "credit_out",
    amount: -amount, // Negativo para salida
    running_balance: 0, // Se calcula en el trigger
    charge_id: chargeId,
    description: `Aplicado a cargo: ${charge.id}`,
    created_by: user?.id || null,
  });

  if (creditError) {
    console.error("Error registrando uso de credito", creditError);
    return { error: "No se pudo aplicar el credito" };
  }

  // Actualizar cargo
  const newBalance = Math.round((charge.balance - amount) * 100) / 100;
  const newStatus = newBalance <= 0.01 ? "pagado" : "pendiente";

  const { error: chargeError } = await supabase
    .from("charges")
    .update({
      paid_amount: supabase.rpc("add_to_field", { field: "paid_amount", increment: amount }) as any,
      balance: newBalance,
      status: newStatus,
    })
    .eq("id", chargeId)
    .eq("condominium_id", condominiumId);

  // Alternativa si el RPC no existe:
  if (chargeError) {
    // Actualizacion directa
    const { data: currentCharge } = await supabase
      .from("charges")
      .select("paid_amount")
      .eq("id", chargeId)
      .single();

    await supabase
      .from("charges")
      .update({
        paid_amount: Number(currentCharge?.paid_amount || 0) + amount,
        balance: newBalance,
        status: newStatus,
      })
      .eq("id", chargeId)
      .eq("condominium_id", condominiumId);
  }

  revalidatePath(`/app/${condominiumId}/unit-credits`);
  revalidatePath(`/app/${condominiumId}/charges`);
  revalidatePath(`/app/${condominiumId}/units/${unitId}`);

  return { success: true, new_balance: newBalance };
}

export async function refundCredit(
  condominiumId: string,
  unitId: string,
  amount: number,
  reason: string
) {
  const supabase = await createClient();

  // Verificar saldo disponible
  const currentBalance = await getUnitCreditBalance(condominiumId, unitId);
  if (currentBalance < amount - 0.01) {
    return { error: "Saldo a favor insuficiente para reembolsar" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Registrar salida de credito por reembolso
  const { error } = await supabase.from("unit_credits").insert({
    condominium_id: condominiumId,
    unit_id: unitId,
    movement_type: "credit_out",
    amount: -amount,
    running_balance: 0,
    description: `Reembolso: ${reason}`,
    created_by: user?.id || null,
  });

  if (error) {
    console.error("Error registrando reembolso", error);
    return { error: "No se pudo registrar el reembolso" };
  }

  revalidatePath(`/app/${condominiumId}/unit-credits`);
  revalidatePath(`/app/${condominiumId}/units/${unitId}`);

  return { success: true };
}

export async function transferCredit(
  condominiumId: string,
  fromUnitId: string,
  toUnitId: string,
  amount: number,
  reason: string
) {
  const supabase = await createClient();

  // Verificar saldo origen
  const fromBalance = await getUnitCreditBalance(condominiumId, fromUnitId);
  if (fromBalance < amount - 0.01) {
    return { error: "Saldo insuficiente en unidad origen" };
  }

  // Verificar que ambas unidades existen
  const { data: units } = await supabase
    .from("units")
    .select("id, identifier")
    .eq("condominium_id", condominiumId)
    .in("id", [fromUnitId, toUnitId]);

  if (!units || units.length !== 2) {
    return { error: "Una o ambas unidades no existen" };
  }

  const fromUnit = units.find((u) => u.id === fromUnitId);
  const toUnit = units.find((u) => u.id === toUnitId);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Registrar salida en origen
  const { error: outError } = await supabase.from("unit_credits").insert({
    condominium_id: condominiumId,
    unit_id: fromUnitId,
    movement_type: "credit_out",
    amount: -amount,
    running_balance: 0,
    description: `Transferencia a ${toUnit?.identifier}: ${reason}`,
    created_by: user?.id || null,
  });

  if (outError) {
    console.error("Error en salida de transferencia", outError);
    return { error: "No se pudo realizar la transferencia" };
  }

  // Registrar entrada en destino
  const { error: inError } = await supabase.from("unit_credits").insert({
    condominium_id: condominiumId,
    unit_id: toUnitId,
    movement_type: "credit_in",
    amount: amount,
    running_balance: 0,
    description: `Transferencia desde ${fromUnit?.identifier}: ${reason}`,
    created_by: user?.id || null,
  });

  if (inError) {
    console.error("Error en entrada de transferencia", inError);
    // Intentar revertir
    await supabase.from("unit_credits").insert({
      condominium_id: condominiumId,
      unit_id: fromUnitId,
      movement_type: "reversal",
      amount: amount,
      running_balance: 0,
      description: `Reversion de transferencia fallida`,
      created_by: user?.id || null,
    });
    return { error: "No se pudo completar la transferencia" };
  }

  revalidatePath(`/app/${condominiumId}/unit-credits`);
  revalidatePath(`/app/${condominiumId}/units/${fromUnitId}`);
  revalidatePath(`/app/${condominiumId}/units/${toUnitId}`);

  return { success: true };
}

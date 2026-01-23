import { UnitChargePreview } from "@/types/charges";

type Distribucion = "por_aliquota" | "igualitario";

export function distribuir(
  unidades: { unit_id: string; unit_name: string; aliquot?: number | null; contact_name?: string | null }[],
  total: number,
  metodo: Distribucion
): UnitChargePreview[] {
  if (metodo === "igualitario") {
    const perUnit = unidades.length > 0 ? total / unidades.length : 0;
    return unidades.map((u) => ({
      unit_id: u.unit_id,
      unit_name: u.unit_name,
      contact_name: u.contact_name,
      include: true,
      suggested_amount: redondear(perUnit),
      final_amount: redondear(perUnit),
    }));
  }

  const sumAliquot = unidades.reduce((acc, u) => acc + Number(u.aliquot || 0), 0) || 1;
  return unidades.map((u) => {
    const cuota = total * (Number(u.aliquot || 0) / sumAliquot);
    const monto = redondear(cuota);
    return {
      unit_id: u.unit_id,
      unit_name: u.unit_name,
      aliquot: u.aliquot,
      contact_name: u.contact_name,
      include: true,
      suggested_amount: monto,
      final_amount: monto,
    };
  });
}

export function distribuirConsumo(
  consumos: { unit_id: string; unit_name: string; consumo: number; contact_name?: string | null }[],
  tarifa: number
): UnitChargePreview[] {
  return consumos.map((c) => {
    const monto = redondear(c.consumo * tarifa);
    return {
      unit_id: c.unit_id,
      unit_name: c.unit_name,
      include: true,
      suggested_amount: monto,
      final_amount: monto,
      contact_name: c.contact_name,
      consumption: c.consumo,
    };
  });
}

function redondear(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

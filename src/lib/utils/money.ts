/**
 * Utilidades para aritmética financiera segura.
 * Convierte a centavos (integers) para evitar errores de punto flotante.
 */

/** Convierte dólares a centavos para cálculos internos */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Convierte centavos a dólares para display */
export function toDollars(cents: number): number {
  return cents / 100;
}

/** Compara dos montos financieros sin errores de punto flotante */
export function amountsEqual(a: number, b: number): boolean {
  return toCents(a) === toCents(b);
}

/** Verifica si un monto está completamente pagado */
export function isFullyPaid(paid: number, total: number): boolean {
  return toCents(paid) >= toCents(total);
}

/** Verifica si un monto es efectivamente cero (< 1 centavo) */
export function isEffectivelyZero(amount: number): boolean {
  return Math.abs(toCents(amount)) === 0;
}

/** Calcula la diferencia entre dos montos, retornando en dólares */
export function amountDifference(a: number, b: number): number {
  return toDollars(toCents(a) - toCents(b));
}

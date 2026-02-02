import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined) {
  const num = Number(value || 0);
  const rounded = Math.round(num * 100) / 100;
  return `$ ${rounded.toLocaleString("es-EC", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Obtiene las iniciales de un nombre completo (primera letra del nombre + primera letra del apellido)
 * Ejemplo: "Enrique Vergara" -> "EV"
 */
export function getInitials(fullName: string | null | undefined): string {
  if (!fullName || fullName.trim() === "") return "?";

  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    // Si solo hay un nombre, tomar las primeras 2 letras
    return parts[0].substring(0, 2).toUpperCase();
  }

  // Tomar primera letra del primer nombre y primera letra del último apellido
  const firstInitial = parts[0][0]?.toUpperCase() || "";
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || "";

  return (firstInitial + lastInitial) || "?";
}

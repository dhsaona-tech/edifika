/**
 * Funciones de validación reutilizables para documentos de identificación
 */

export type DocumentType = "CEDULA" | "RUC" | "PASAPORTE";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valida formato de Cédula Ecuatoriana (10 dígitos)
 */
export function validateCedula(cedula: string): ValidationResult {
  if (!cedula || cedula.trim() === "") {
    return { isValid: false, error: "La cédula es obligatoria" };
  }

  // Solo números
  if (!/^\d+$/.test(cedula)) {
    return { isValid: false, error: "La cédula solo debe contener números" };
  }

  // Exactamente 10 dígitos
  if (cedula.length !== 10) {
    return { isValid: false, error: "La cédula debe tener exactamente 10 dígitos" };
  }

  return { isValid: true };
}

/**
 * Valida formato de RUC Ecuatoriano (13 dígitos)
 */
export function validateRUC(ruc: string): ValidationResult {
  if (!ruc || ruc.trim() === "") {
    return { isValid: false, error: "El RUC es obligatorio" };
  }

  // Solo números
  if (!/^\d+$/.test(ruc)) {
    return { isValid: false, error: "El RUC solo debe contener números" };
  }

  // Exactamente 13 dígitos
  if (ruc.length !== 13) {
    return { isValid: false, error: "El RUC debe tener exactamente 13 dígitos" };
  }

  return { isValid: true };
}

/**
 * Valida formato de Pasaporte (mínimo 6 caracteres alfanuméricos)
 */
export function validatePasaporte(pasaporte: string): ValidationResult {
  if (!pasaporte || pasaporte.trim() === "") {
    return { isValid: false, error: "El pasaporte es obligatorio" };
  }

  // Al menos 6 caracteres alfanuméricos
  if (pasaporte.length < 6) {
    return { isValid: false, error: "El pasaporte debe tener al menos 6 caracteres" };
  }

  return { isValid: true };
}

/**
 * Valida documento según su tipo
 */
export function validateDocument(
  document: string,
  type: DocumentType
): ValidationResult {
  switch (type) {
    case "CEDULA":
      return validateCedula(document);
    case "RUC":
      return validateRUC(document);
    case "PASAPORTE":
      return validatePasaporte(document);
    default:
      return { isValid: false, error: "Tipo de documento no válido" };
  }
}

/**
 * Valida que un campo numérico esté dentro de un rango
 */
export function validateNumberRange(
  value: number | string,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} debe ser un número válido` };
  }

  if (num < min) {
    return { isValid: false, error: `${fieldName} debe ser mayor o igual a ${min}` };
  }

  if (num > max) {
    return { isValid: false, error: `${fieldName} debe ser menor o igual a ${max}` };
  }

  return { isValid: true };
}

/**
 * Valida que un campo no esté vacío
 */
export function validateRequired(
  value: string | null | undefined,
  fieldName: string
): ValidationResult {
  if (!value || value.trim() === "") {
    return { isValid: false, error: `${fieldName} es obligatorio` };
  }
  return { isValid: true };
}

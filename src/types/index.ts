// src/types/index.ts

// ==========================================
// 1. CONDOMINIOS
// ==========================================
export interface Condominium {
  id: string;
  name: string;
  use_blocks: boolean | null;
  developer_profile_id: string | null;
  ruc?: string | null;
  address?: string | null;
  phone?: string | null;
  administrator_name?: string | null;
  property_type?: "urbanizacion" | "conjunto" | "edificio" | null;
  logo_url?: string | null;
}

// ==========================================
// 2. UNIDADES
// ==========================================
export interface Unit {
  id: string;
  condominium_id: string;
  identifier: string;
  block_identifier: string | null;
  full_identifier: string | null;
  type: string;
  area: number | null;
  aliquot: number;
  status: "activa" | "inactiva";
  parent_unit_id: string | null;
  credit_balance?: number; // Saldo a favor (cache del ledger unit_credits)
}

// ==========================================
// 3. PERFILES (Personas) - ACTUALIZADO
// ==========================================

// Estructura para el campo JSONB 'preferences'
export interface ProfilePreferences {
  notify_statements: boolean; // Recibir estados de cuenta
  notify_receipts: boolean;   // Recibir recibos de pago
  notify_news: boolean;       // Recibir circulares
  channel: "email" | "whatsapp" | "phone";
}

export interface Profile {
  id: string;
  created_at?: string;

  // --- Identidad ---
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  national_id: string | null; // Cédula/RUC (Único)
  id_type?: string | null;    // 'CEDULA', 'RUC', 'PASAPORTE'

  // --- Nuevo: Tipo de Persona ---
  is_legal_entity: boolean;   // true = Empresa, false = Natural

  // --- Contacto ---
  email?: string | null;
  phone?: string | null;
  contact_preference?: string; // (Legacy/Simple)

  // --- Nuevo: Ubicación ---
  address?: string | null;
  country?: string | null;

  // --- Nuevo: Gestión y Preferencias ---
  notes?: string | null;      // Notas internas del admin
  status?: 'active' | 'inactive';
  preferences?: ProfilePreferences; // Mapeo del JSONB
}

// ==========================================
// 4. CONTACTOS DE UNIDAD (Relación)
// ==========================================
export interface UnitContact {
  id: string;
  unit_id: string;
  profile_id: string;

  // Relación
  relationship_type: "OWNER" | "TENANT" | "DEVELOPER" | "FAMILY";
  is_primary_contact: boolean;
  is_current_occupant: boolean;

  // Configuración Financiera
  receives_debt_emails: boolean;
  receives_payment_receipts: boolean; // Nuevo según tu schema
  ownership_share: number;            // Porcentaje de propiedad (numeric)

  // Tiempos
  start_date: string | null;
  end_date: string | null;

  // Relaciones (Joins opcionales)
  profile?: Profile;
  unit?: Unit;
}

// ==========================================
// 5. RESUMEN PARA LISTAS DE UNIDADES
// ==========================================
export interface UnitSummary extends Unit {
  primary_owner_name: string | null;
  current_occupant_name: string | null;
  // Resumen financiero (opcional)
  pending_balance?: number;
  total_balance?: number;
  debt_status?: "al_dia" | "pendiente";
}

// ==========================================
// 6. PROVEEDORES
// ==========================================
export interface Supplier {
  id: string;
  condominium_id: string;
  name: string; // Razón Social o Nombre
  fiscal_id: string | null; // RUC
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  category: string | null; // ej. Mantenimiento, Servicios Básicos
  is_active: boolean;
}

// ==========================================
// 7. RESUMEN DE RESIDENTE (Para el Directorio)
// ==========================================
export interface ResidentSummary extends Profile {
  units_owned: string[];  // Lista visual: ["Torre A-101", "Bodega 2"]
  units_rented: string[]; // Lista visual
  roles: string[];        // ["Propietario", "Inquilino"]

  // Contadores para badges rápidos
  units_owned_count?: number;
  units_rented_count?: number;
}

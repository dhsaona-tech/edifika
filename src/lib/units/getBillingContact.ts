type UnitContact = {
    id: string;
    relationship_type: string;
    is_primary_contact: boolean;
    end_date: string | null;
    profile: {
      full_name: string;
      first_name?: string;
      last_name?: string;
    } | Array<{
      full_name: string;
      first_name?: string;
      last_name?: string;
    }>;
  };
  
  /**
   * Determina quién es el contacto responsable de facturación según jerarquía:
   * 1. Manual override (is_primary_contact = true)
   * 2. Inquilino activo (TENANT)
   * 3. Propietario activo (OWNER)
   * 4. Constructora (DEVELOPER)
   */
  export function getBillingContact(contacts: UnitContact[]) {
    // Filtrar solo contactos activos (sin end_date)
    const activeContacts = contacts.filter(c => !c.end_date);
  
    if (activeContacts.length === 0) {
      return {
        id: null,
        name: "Sin asignar",
        type: null,
      };
    }
  
    // Helper para extraer nombre
    const getName = (contact: UnitContact) => {
      const profile = Array.isArray(contact.profile) 
        ? contact.profile[0] 
        : contact.profile;
      return profile?.full_name || 
             `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || 
             "Sin nombre";
    };
  
    // Prioridad 1: Manual override
    const manualPrimary = activeContacts.find(c => c.is_primary_contact);
    if (manualPrimary) {
      return {
        id: manualPrimary.id,
        name: getName(manualPrimary),
        type: manualPrimary.relationship_type,
      };
    }
  
    // Prioridad 2: Inquilino activo
    const tenant = activeContacts.find(c => c.relationship_type === 'TENANT');
    if (tenant) {
      return {
        id: tenant.id,
        name: getName(tenant),
        type: 'TENANT',
      };
    }
  
    // Prioridad 3: Propietario activo
    const owner = activeContacts.find(c => c.relationship_type === 'OWNER');
    if (owner) {
      return {
        id: owner.id,
        name: getName(owner),
        type: 'OWNER',
      };
    }
  
    // Prioridad 4: Constructora
    const developer = activeContacts.find(c => c.relationship_type === 'DEVELOPER');
    if (developer) {
      return {
        id: developer.id,
        name: getName(developer),
        type: 'DEVELOPER',
      };
    }
  
    // Fallback: primer contacto activo
    const fallback = activeContacts[0];
    return {
      id: fallback.id,
      name: getName(fallback),
      type: fallback.relationship_type,
    };
  }
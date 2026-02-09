import { createClient } from "@/lib/supabase/server";

export interface CondominiumOption {
  id: string;
  name: string;
}

export interface LayoutData {
  condominiumId: string;
  condominiumName: string;
  condominiumType: string;
  currentMonth: string;
  userName: string;
  userRole: string;
  userInitials: string;
  condominiums: CondominiumOption[];
}

export async function getLayoutData(condominiumId: string): Promise<LayoutData> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      condominiumId,
      condominiumName: "Sin nombre",
      condominiumType: "",
      currentMonth: new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      userName: "Usuario",
      userRole: "Usuario",
      userInitials: "U",
      condominiums: [],
    };
  }

  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, first_name, is_superadmin")
    .eq("id", user.id)
    .single();

  // Obtener datos del condominio actual
  const { data: condo } = await supabase
    .from("condominiums")
    .select("name, type")
    .eq("id", condominiumId)
    .single();

  // Obtener rol del usuario en este condominio
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("condominium_id", condominiumId)
    .eq("profile_id", user.id)
    .single();

  // Obtener lista de condominios accesibles
  let condominiums: CondominiumOption[] = [];
  if (profile?.is_superadmin) {
    const { data: allCondos } = await supabase
      .from("condominiums")
      .select("id, name")
      .order("name");
    condominiums = (allCondos || []).map(c => ({ id: c.id, name: c.name }));
  } else {
    const { data: userMemberships } = await supabase
      .from("memberships")
      .select("condominium_id, condominium:condominiums(id, name)")
      .eq("profile_id", user.id)
      .eq("status", "activo");
    condominiums = (userMemberships || [])
      .map((m: any) => ({ id: m.condominium?.id, name: m.condominium?.name }))
      .filter((c: any) => c.id);
  }

  // Calcular iniciales
  const userName = profile?.full_name || profile?.first_name || "Usuario";
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Determinar rol
  let userRole = "Usuario";
  if (profile?.is_superadmin) {
    userRole = "Super Admin";
  } else if (membership?.role === "ADMIN") {
    userRole = "Administrador";
  } else if (membership?.role === "RESIDENTE") {
    userRole = "Residente";
  } else if (membership?.role === "DIRECTIVA") {
    userRole = "Directiva";
  } else if (membership?.role === "GUARDIA") {
    userRole = "Guardia";
  }

  const currentMonth = new Date().toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  }).toUpperCase();

  return {
    condominiumId,
    condominiumName: condo?.name || "Sin nombre",
    condominiumType: condo?.type || "",
    currentMonth,
    userName,
    userRole,
    userInitials: initials,
    condominiums,
  };
}

import { createClient } from "@/lib/supabase/server";

export async function getLayoutData(condominiumId: string) {
  const supabase = await createClient();

  // Obtener datos del usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      condominiumName: "Sin nombre",
      currentMonth: new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      userName: "Usuario",
      userRole: "Usuario",
      userInitials: "U",
    };
  }

  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, first_name, is_superadmin")
    .eq("id", user.id)
    .single();

  // Obtener datos del condominio
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
    userRole = "Superadmin";
  } else if (membership?.role === "ADMIN") {
    userRole = "Administrador";
  } else if (membership?.role === "RESIDENT") {
    userRole = "Residente";
  }

  // Mes actual en español
  const currentMonth = new Date().toLocaleDateString('es-ES', { 
    month: 'long', 
    year: 'numeric' 
  }).toUpperCase();

  return {
    condominiumName: condo?.name || "Sin nombre",
    condominiumType: condo?.type || "",
    currentMonth,
    userName,
    userRole,
    userInitials: initials,
  };
}
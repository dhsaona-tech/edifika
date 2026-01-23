import { Profile } from "@/types";

interface ProfileHeaderProps {
  profile: Profile;
  roles: string[];
}

export default function ProfileHeader({ profile, roles }: ProfileHeaderProps) {
  // Generar iniciales
  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  return (
    // CAMBIO CLAVE: py-3 (muy bajito) y flex-row para poner todo en una línea
    <div className="bg-white rounded-lg shadow-sm border border-secondary-dark px-5 py-3 flex items-center justify-between">
      
      {/* IZQUIERDA: Avatar pequeño + Datos en línea */}
      <div className="flex items-center gap-3">
        
        {/* Avatar reducido de h-20 a h-10 (40px) */}
        <div className="h-10 w-10 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
          {initials}
        </div>

        <div className="flex flex-col md:flex-row md:items-baseline md:gap-3">
          {/* Nombre tamaño normal (no gigante) */}
          <h1 className="text-base font-bold text-gray-800 leading-tight">
            {profile.full_name || "Sin Nombre"}
          </h1>
          
          {/* Email y ID pequeños y grises */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {profile.email && (
               <span className="flex items-center gap-1 hover:text-brand transition-colors cursor-pointer">
                 ✉️ {profile.email}
               </span>
            )}
            {profile.national_id && (
               <span className="hidden md:flex items-center gap-1 border-l border-gray-300 pl-3">
                 🆔 {profile.national_id}
               </span>
            )}
          </div>
        </div>
      </div>

      {/* DERECHA: Badges pequeños */}
      <div className="flex gap-2">
        {roles.map((role) => (
          <span
            key={role}
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
              role === "Propietario"
                ? "bg-purple-50 text-brand border-purple-100"
                : "bg-blue-50 text-blue-700 border-blue-100"
            }`}
          >
            {role}
          </span>
        ))}
      </div>
    </div>
  );
}
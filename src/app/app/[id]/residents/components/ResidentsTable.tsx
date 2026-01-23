import { ResidentSummary } from "@/types";
import Link from "next/link";
import { Mail, Phone, Pencil } from "lucide-react";

interface Props {
  residents: ResidentSummary[];
  condominiumId: string;
}

export default function ResidentsTable({ residents, condominiumId }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
            <th className="px-6 py-3 font-bold">Residente</th>
            <th className="px-6 py-3 font-bold">Contacto</th>
            <th className="px-6 py-3 font-bold text-center">Roles</th>
            <th className="px-6 py-3 font-bold">Unidades</th>
            <th className="px-6 py-3 font-bold text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {residents.map((resident) => (
            <tr key={resident.id} className="hover:bg-slate-50/80 transition-colors group">
              
              {/* RESIDENTE */}
              <td className="px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm border border-purple-100">
                    {resident.full_name ? resident.full_name.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 leading-tight">{resident.full_name}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {resident.national_id || "Sin ID"}
                    </div>
                  </div>
                </div>
              </td>

              {/* CONTACTO */}
              <td className="px-6 py-3">
                <div className="flex flex-col gap-1.5">
                    {resident.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span className="truncate max-w-[160px]">{resident.email}</span>
                        </div>
                    )}
                    {resident.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{resident.phone}</span>
                        </div>
                    )}
                </div>
              </td>

              {/* ROLES (Tamaño SUPER REDUCIDO) */}
              <td className="px-6 py-3 text-center">
                <div className="flex flex-col gap-1 items-center justify-center">
                    {resident.roles.map(role => (
                        <span key={role} className={`text-[9px] px-2 py-[2px] rounded-md font-bold uppercase border tracking-wide ${
                            role === 'Propietario' 
                                ? 'bg-purple-50 text-brand border-purple-200' // Morado Oscuro (Brand)
                                : role === 'Inquilino' 
                                    ? 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100' // Morado Lila/Fucsia
                                    : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}>
                            {role}
                        </span>
                    ))}
                    {resident.roles.length === 0 && (
                        <span className="text-[9px] px-2 py-[2px] rounded-md bg-gray-50 text-gray-400 border border-gray-100">Sin Asignar</span>
                    )}
                </div>
              </td>

              {/* UNIDADES */}
              <td className="px-6 py-3">
                <div className="flex flex-col gap-2">
                    {/* PROPIEDADES */}
                    {resident.units_owned.map((unit, i) => (
                        <div key={`owned-${i}`} className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800">{unit}</span>
                        </div>
                    ))}
                    
                    {/* ARRIENDOS */}
                    {resident.units_rented.map((unit, i) => (
                        <div key={`rented-${i}`} className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800">{unit}</span>
                        </div>
                    ))}

                    {resident.units_owned.length === 0 && resident.units_rented.length === 0 && (
                        <span className="text-[11px] text-gray-400 italic font-light">--</span>
                    )}
                </div>
              </td>

              {/* ACCIONES */}
              <td className="px-6 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                    <Link 
                        href={`/app/${condominiumId}/residents/${resident.id}`}
                        className="p-2 text-gray-400 hover:text-brand hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                        title="Ver Ficha"
                    >
                        <Pencil className="w-4 h-4" />
                    </Link>
                </div>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
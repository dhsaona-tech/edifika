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
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-1.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider">Residente</th>
            <th className="px-3 py-1.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider">Contacto</th>
            <th className="px-3 py-1.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wider">Roles</th>
            <th className="px-3 py-1.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider">Unidades</th>
            <th className="px-3 py-1.5 text-right text-[11px] font-bold text-gray-600 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {residents.map((resident) => (
            <tr key={resident.id} className="hover:bg-gray-50 transition-colors group">
              
              {/* RESIDENTE */}
              <td className="px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-bold shrink-0 border border-brand/20">
                    {resident.full_name ? resident.full_name.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-gray-900 leading-tight">{resident.full_name}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                        {resident.national_id || "Sin ID"}
                    </div>
                  </div>
                </div>
              </td>

              {/* CONTACTO */}
              <td className="px-3 py-1.5">
                <div className="flex flex-col gap-0.5">
                    {resident.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                            <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{resident.email}</span>
                        </div>
                    )}
                    {resident.phone && (
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{resident.phone}</span>
                        </div>
                    )}
                </div>
              </td>

              {/* ROLES */}
              <td className="px-3 py-1.5 text-center">
                <div className="flex flex-col gap-0.5 items-center justify-center">
                    {resident.roles.map(role => (
                        <span key={role} className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase border ${
                            role === 'Propietario' 
                                ? 'bg-brand/5 text-brand border-brand/20'
                                : role === 'Inquilino' 
                                    ? 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100'
                                    : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}>
                            {role}
                        </span>
                    ))}
                    {resident.roles.length === 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200">Sin asignar</span>
                    )}
                </div>
              </td>

              {/* UNIDADES */}
              <td className="px-3 py-1.5">
                <div className="flex flex-col gap-0.5">
                    {resident.units_owned.map((unit, i) => (
                        <span key={`owned-${i}`} className="text-[12px] font-medium text-gray-800">{unit}</span>
                    ))}
                    {resident.units_rented.map((unit, i) => (
                        <span key={`rented-${i}`} className="text-[12px] font-medium text-gray-800">{unit}</span>
                    ))}
                    {resident.units_owned.length === 0 && resident.units_rented.length === 0 && (
                        <span className="text-[10px] text-gray-500">—</span>
                    )}
                </div>
              </td>

              {/* ACCIONES */}
              <td className="px-3 py-1.5 text-right">
                <Link 
                  href={`/app/${condominiumId}/residents/${resident.id}`}
                  className="inline-flex p-1.5 text-gray-400 hover:text-brand hover:bg-brand/5 rounded transition-colors"
                  title="Ver Ficha"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
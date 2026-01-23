import { UnitSummary } from "@/types";
import { Eye, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import EditUnitModal from "./EditUnitModal";
import { formatCurrency, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Props = {
  units: (UnitSummary & {
    contacts?: Array<{
      id: string;
      full_name: string;
      relationship_type: string;
      is_primary_contact: boolean;
    }>;
    owners_count?: number;
    tenants_count?: number;
    owners?: Array<{ full_name: string; is_primary_contact: boolean }>;
    tenants?: Array<{ full_name: string }>;
  })[];
  condominiumId: string;
  estimatedCharges?: Record<string, number | null>;
  distributionMethod?: string;
};

export default function UnitsTable({
  units,
  condominiumId,
  estimatedCharges,
  distributionMethod,
}: Props) {
  if (units.length === 0) return null;

  const formatAliquot = (num: number) => Number(num).toString();
  const showEstimated = Boolean(estimatedCharges && distributionMethod);

  return (
    <div className="bg-white rounded-lg shadow border border-secondary-dark overflow-hidden">
      <table className="w-full text-xs text-left">
        <thead className="bg-secondary text-gray-700 font-semibold uppercase text-[11px] tracking-wider">
          <tr>
            <th className="px-6 py-4 border-b border-secondary-dark">Unidad / Inmueble</th>
            <th className="px-6 py-4 border-b border-secondary-dark">Personas</th>
            <th className="px-6 py-4 border-b border-secondary-dark text-right">Alícuota</th>
            <th className="px-6 py-4 border-b border-secondary-dark text-right">
              Valor Est. {distributionMethod === "manual_por_unidad" ? "(pendiente)" : ""}
            </th>
            <th className="px-6 py-4 border-b border-secondary-dark text-center">Estado Deuda</th>
            <th className="px-6 py-4 border-b border-secondary-dark text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {units.map((unit) => {
            const contacts = unit.contacts || [];
            const owners = unit.owners || [];
            const tenants = unit.tenants || [];
            const totalContacts = contacts.length;

            return (
              <tr key={unit.id} className="hover:bg-slate-50 transition-colors group">
                {/* COLUMNA 1: UNIDAD */}
                <td className="px-6 py-4">
                  <Link href={`/app/${condominiumId}/units/${unit.id}`} className="hover:text-brand block">
                    <span className="block font-bold text-gray-900 capitalize text-sm mb-0.5">
                      {unit.full_identifier || `${unit.type} ${unit.identifier}`}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium capitalize flex items-center gap-1">
                      {unit.type}
                      {unit.block_identifier && (
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200 ml-1">
                          {unit.block_identifier}
                        </span>
                      )}
                    </span>
                  </Link>
                </td>

                {/* COLUMNA 2: PERSONAS */}
                <td className="px-6 py-4">
                  {totalContacts === 0 ? (
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <span>Sin asignar</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {/* Avatares con iniciales */}
                      <div className="flex items-center gap-2 -space-x-1">
                        {contacts.slice(0, 5).map((contact) => {
                          const initials = getInitials(contact.full_name);
                          const isPrimary = contact.is_primary_contact;

                          return (
                            <div
                              key={contact.id}
                              className="relative group/avatar"
                              title={`${contact.full_name}${isPrimary ? " (Titular)" : ""}`}
                            >
                              <div
                                className={cn(
                                  "w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center text-[10px] text-brand font-bold border border-brand/20 shrink-0 transition-all hover:scale-110",
                                  isPrimary && "ring-2 ring-brand/30 ring-offset-1"
                                )}
                              >
                                {initials}
                              </div>
                              {isPrimary && (
                                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-brand rounded-full border-2 border-white"></div>
                              )}
                            </div>
                          );
                        })}
                        {totalContacts > 5 && (
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600 font-bold border border-gray-200">
                            +{totalContacts - 5}
                          </div>
                        )}
                      </div>

                      {/* Nombres y info */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-gray-700 font-medium truncate max-w-[200px] text-sm">
                          {contacts
                            .slice(0, 2)
                            .map((c) => c.full_name)
                            .join(", ")}
                          {contacts.length > 2 && ` +${contacts.length - 2} más`}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                          {owners.length > 0 && (
                            <span>{owners.length} {owners.length === 1 ? "dueño" : "dueños"}</span>
                          )}
                          {tenants.length > 0 && (
                            <span className={owners.length > 0 ? "border-l pl-2 border-gray-300" : ""}>
                              {tenants.length} {tenants.length === 1 ? "inquilino" : "inquilinos"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 font-mono text-gray-600 text-right">{formatAliquot(unit.aliquot)}%</td>

                <td className="px-6 py-4 font-mono text-gray-600 text-right">
                  {showEstimated ? (
                    distributionMethod === "manual_por_unidad" ? (
                      <span className="text-gray-400">Pendiente</span>
                    ) : (
                      <span>{formatCurrency(estimatedCharges?.[unit.id] || 0)}</span>
                    )
                  ) : (
                    <span className="text-gray-400">$0.00</span>
                  )}
                </td>

                <td className="px-6 py-4 text-center">
                  {Number(unit.pending_balance || 0) > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                      <AlertTriangle size={10} /> Pendiente
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                      <CheckCircle2 size={10} /> Al día
                    </span>
                  )}
                </td>

                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end items-center gap-1">
                    <EditUnitModal unit={unit} condominiumId={condominiumId} iconOnly />
                    <Link
                      href={`/app/${condominiumId}/units/${unit.id}`}
                      className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-brand hover:bg-brand/5 rounded-full transition-all"
                      title="Ver Detalle Completo"
                    >
                      <Eye size={16} />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import Link from "next/link";

type Unit = {
  id: string;
  identifier: string;
  full_identifier: string;
  type: string;
  block_identifier?: string | null;
  aliquot: number;
  status: string;
  primary_owner_name?: string | null;
  current_occupant_name?: string | null;
};

const unitTypeIcons: Record<string, string> = {
  departamento: "🏢",
  casa: "🏠",
  local: "🏪",
  bodega: "📦",
  parqueo: "🚗",
  parqueadero: "🚗",
  otro: "🔲",
};

const statusColors: Record<string, string> = {
  activa: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactiva: "bg-gray-50 text-gray-600 border-gray-200",
  en_construccion: "bg-amber-50 text-amber-700 border-amber-200",
};

const statusLabels: Record<string, string> = {
  activa: "✓ Activa",
  inactiva: "Inactiva",
  en_construccion: "En construcción",
};

// Helper para capitalizar
const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function UnitsTable({
  units,
  condominiumId,
}: {
  units: Unit[];
  condominiumId: string;
}) {
  if (units.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-2">
          <span className="text-xl">🏢</span>
        </div>
        <p className="text-xs font-semibold text-gray-900 mb-1">No hay unidades</p>
        <p className="text-[11px] text-gray-500">Agrega la primera unidad</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                Unidad
              </th>
              <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                Ubicación
              </th>
              <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                Propietario
              </th>
              <th className="px-3 py-2 text-right text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                Alícuota
              </th>
              <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-3 py-2 text-right text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {units.map((unit) => (
              <tr
                key={unit.id}
                className="hover:bg-gray-50 transition-colors group"
              >
                {/* Unidad: nombre debajo = mismo dueño principal que columna Propietario (backend) */}
                <td className="px-3 py-2">
                  <div>
                    <Link
                      href={`/app/${condominiumId}/units/${unit.id}`}
                      className="text-xs font-semibold text-gray-900 hover:text-brand transition-colors"
                    >
                      {capitalize(unit.full_identifier)}
                    </Link>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {unit.primary_owner_name ? capitalize(unit.primary_owner_name) : "Sin asignar"}
                    </p>
                  </div>
                </td>

                {/* Tipo */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm opacity-60">
                      {unitTypeIcons[unit.type] || "🔲"}
                    </span>
                    <span className="text-[11px] text-gray-700 font-medium">
                      {capitalize(unit.type)}
                    </span>
                  </div>
                </td>

                {/* Ubicación */}
                <td className="px-3 py-2">
                  <span className="text-[11px] text-gray-600">
                    {unit.block_identifier ? `Bloque ${unit.block_identifier}` : "—"}
                  </span>
                </td>

                {/* Propietario */}
                <td className="px-3 py-2">
                  <span className="text-[11px] text-gray-700 font-medium">
                    {unit.primary_owner_name ? capitalize(unit.primary_owner_name) : "Sin asignar"}
                  </span>
                </td>

                {/* Alícuota */}
                <td className="px-3 py-2 text-right">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-brand/5 text-brand text-[11px] font-bold border border-brand/10">
                    {unit.aliquot ? `${Number(unit.aliquot).toFixed(2)}%` : "—"}
                  </span>
                </td>

                {/* Estado */}
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${
                      statusColors[unit.status] || statusColors.inactiva
                    }`}
                  >
                    {statusLabels[unit.status] || unit.status}
                  </span>
                </td>

                {/* Acciones */}
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/app/${condominiumId}/units/${unit.id}`}
                      className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:border-brand hover:text-brand transition-colors"
                    >
                      Ver
                    </Link>
                    <Link
                      href={`/app/${condominiumId}/units/${unit.id}/edit`}
                      className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:border-brand hover:text-brand transition-colors"
                    >
                      Editar
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-3 py-1.5 border-t border-gray-200">
        <p className="text-[10px] text-gray-600">
          <span className="font-semibold text-gray-900">{units.length}</span> {units.length === 1 ? "unidad" : "unidades"}
        </p>
      </div>
    </div>
  );
}
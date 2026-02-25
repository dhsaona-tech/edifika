"use client";

import { useState, useTransition } from "react";
import { Check, CheckStatus } from "@/types/financial";
import { updateCheckStatus } from "../../actions";
import {
  FileCheck,
  CircleCheck,
  CircleX,
  CircleSlash,
  AlertCircle,
  Search,
} from "lucide-react";

type Props = {
  condominiumId: string;
  checks: (Check & { checkbook?: { start_number: number; end_number: number } })[];
};

const statusConfig: Record<
  CheckStatus,
  { label: string; color: string; bgColor: string; icon: typeof CircleCheck }
> = {
  disponible: {
    label: "Disponible",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
    icon: CircleCheck,
  },
  usado: {
    label: "Emitido",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    icon: FileCheck,
  },
  anulado: {
    label: "Anulado",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    icon: CircleX,
  },
  perdido: {
    label: "Perdido",
    color: "text-gray-700",
    bgColor: "bg-gray-100 border-gray-200",
    icon: CircleSlash,
  },
};

export default function ChecksTab({ condominiumId, checks }: Props) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<CheckStatus | "all">("all");
  const [search, setSearch] = useState("");

  // Estadísticas
  const stats = {
    disponible: checks.filter((c) => c.status === "disponible").length,
    usado: checks.filter((c) => c.status === "usado").length,
    anulado: checks.filter((c) => c.status === "anulado").length,
    perdido: checks.filter((c) => c.status === "perdido").length,
    total: checks.length,
  };

  // Filtrar cheques
  const filteredChecks = checks
    .filter((c) => filter === "all" || c.status === filter)
    .filter((c) => !search || c.check_number.toString().includes(search));

  const handleChange = (checkId: string, status: CheckStatus) => {
    startTransition(async () => {
      await updateCheckStatus(condominiumId, checkId, status);
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] uppercase font-semibold text-gray-500">Cheques</p>
            <h3 className="text-lg font-semibold text-gray-900">Listado y Estado</h3>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-2 rounded-lg text-center transition-colors ${
              filter === "all"
                ? "bg-gray-900 text-white"
                : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <p className="text-lg font-bold">{stats.total}</p>
            <p className="text-[10px] uppercase font-semibold opacity-75">Total</p>
          </button>
          <button
            onClick={() => setFilter("disponible")}
            className={`px-3 py-2 rounded-lg text-center transition-colors ${
              filter === "disponible"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700"
            }`}
          >
            <p className="text-lg font-bold">{stats.disponible}</p>
            <p className="text-[10px] uppercase font-semibold opacity-75">Disponibles</p>
          </button>
          <button
            onClick={() => setFilter("usado")}
            className={`px-3 py-2 rounded-lg text-center transition-colors ${
              filter === "usado"
                ? "bg-blue-600 text-white"
                : "bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700"
            }`}
          >
            <p className="text-lg font-bold">{stats.usado}</p>
            <p className="text-[10px] uppercase font-semibold opacity-75">Emitidos</p>
          </button>
          <button
            onClick={() => setFilter("anulado")}
            className={`px-3 py-2 rounded-lg text-center transition-colors ${
              filter === "anulado"
                ? "bg-red-600 text-white"
                : "bg-red-50 hover:bg-red-100 border border-red-200 text-red-700"
            }`}
          >
            <p className="text-lg font-bold">{stats.anulado}</p>
            <p className="text-[10px] uppercase font-semibold opacity-75">Anulados</p>
          </button>
          <button
            onClick={() => setFilter("perdido")}
            className={`px-3 py-2 rounded-lg text-center transition-colors ${
              filter === "perdido"
                ? "bg-gray-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700"
            }`}
          >
            <p className="text-lg font-bold">{stats.perdido}</p>
            <p className="text-[10px] uppercase font-semibold opacity-75">Perdidos</p>
          </button>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número de cheque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:border-brand focus:ring-brand/20"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Número</th>
              <th className="px-4 py-3 text-left">Chequera</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-left">Fecha emisión</th>
              <th className="px-4 py-3 text-left">Egreso</th>
              <th className="px-4 py-3 text-left">Notas</th>
              <th className="px-4 py-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredChecks.map((chk) => {
              const config = statusConfig[chk.status];
              const Icon = config.icon;
              const canChange = chk.status === "disponible" || chk.status === "perdido";

              return (
                <tr key={chk.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-gray-900 text-base">
                      {chk.check_number.toString().padStart(6, "0")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {chk.checkbook
                      ? `${chk.checkbook.start_number} - ${chk.checkbook.end_number}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bgColor} ${config.color}`}
                    >
                      <Icon size={12} />
                      {config.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {chk.issue_date
                      ? new Date(chk.issue_date).toLocaleDateString("es-EC", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {chk.egress_id ? (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        EG-{chk.egress_id.slice(0, 8)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[150px] truncate">
                    {chk.notes || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {canChange ? (
                      <select
                        disabled={isPending}
                        value={chk.status}
                        onChange={(e) => handleChange(chk.id, e.target.value as CheckStatus)}
                        className="text-xs rounded-md border border-gray-200 bg-white px-2 py-1.5 shadow-sm focus:border-brand focus:ring-brand/20"
                      >
                        <option value="disponible">Disponible</option>
                        <option value="anulado">Anular</option>
                        <option value="perdido">Perdido</option>
                      </select>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredChecks.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={7}>
                  <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>
                    {checks.length === 0
                      ? "No hay cheques generados"
                      : "No hay cheques que coincidan con el filtro"}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredChecks.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500 text-right">
          Mostrando {filteredChecks.length} de {checks.length} cheque(s)
        </div>
      )}
    </div>
  );
}

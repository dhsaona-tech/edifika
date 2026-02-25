"use client";

import { useRouter, usePathname } from "next/navigation";
import { Calendar, Filter } from "lucide-react";

interface Props {
  condominiumId: string;
  unitId: string;
  currentFilters: { from?: string; to?: string; status?: string };
}

export default function CarteraFilters({ condominiumId, unitId, currentFilters }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();

    if (currentFilters.from && key !== "from") params.set("from", currentFilters.from);
    if (currentFilters.to && key !== "to") params.set("to", currentFilters.to);
    if (currentFilters.status && key !== "status") params.set("status", currentFilters.status);

    if (value) {
      params.set(key, value);
    }

    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  };

  const clearFilters = () => {
    router.push(pathname);
  };

  const hasFilters = currentFilters.from || currentFilters.to || currentFilters.status;

  // Valores por defecto para fechas (últimos 12 meses)
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Filter size={14} />
          <span className="font-medium">Filtros:</span>
        </div>

        {/* Fecha desde */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500">Desde:</label>
          <input
            type="date"
            value={currentFilters.from || ""}
            onChange={(e) => handleFilterChange("from", e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-xs focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
          />
        </div>

        {/* Fecha hasta */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500">Hasta:</label>
          <input
            type="date"
            value={currentFilters.to || ""}
            onChange={(e) => handleFilterChange("to", e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-xs focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
          />
        </div>

        {/* Estado */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500">Estado:</label>
          <select
            value={currentFilters.status || ""}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="pagado">Pagados</option>
          </select>
        </div>

        {/* Botón limpiar */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";

export default function BudgetFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const year = searchParams.get("year") || "";
  const status = searchParams.get("status") || "todos";

  const update = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams);
    value ? params.set(key, value) : params.delete(key);
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-auto sm:min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/10"
          placeholder="Filtrar por año (ej. 2025)"
          defaultValue={year}
          onChange={(e) => update("year", e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm text-xs font-semibold text-gray-700">
        <SlidersHorizontal size={14} className="text-gray-400" />
        <select
          className="bg-transparent focus:outline-none"
          value={status}
          onChange={(e) => update("status", e.target.value === "todos" ? undefined : e.target.value)}
        >
          <option value="todos">Estado: Todos</option>
          <option value="borrador">Borrador</option>
          <option value="aprobado">Aprobado</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>
    </div>
  );
}

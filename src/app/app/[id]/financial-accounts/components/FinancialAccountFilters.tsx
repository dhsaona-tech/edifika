"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";

export default function FinancialAccountFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "all";
  const state = searchParams.get("state") || "active";

  const update = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams);
    value ? params.set(key, value) : params.delete(key);
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[240px] max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/10"
          placeholder="Buscar por nombre o numero"
          defaultValue={q}
          onChange={(e) => update("q", e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm text-xs font-semibold text-gray-700">
        <SlidersHorizontal size={14} className="text-gray-400" />
        <select
          className="bg-transparent focus:outline-none"
          value={type}
          onChange={(e) => update("type", e.target.value === "all" ? undefined : e.target.value)}
        >
          <option value="all">Tipo: Todos</option>
          <option value="corriente">Cuenta corriente</option>
          <option value="ahorros">Cuenta de ahorros</option>
          <option value="caja_chica">Caja chica</option>
        </select>
        <span className="h-4 w-px bg-gray-200" />
        <select
          className="bg-transparent focus:outline-none"
          value={state}
          onChange={(e) => update("state", e.target.value === "active" ? "active" : e.target.value)}
        >
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
          <option value="all">Todas</option>
        </select>
      </div>
    </div>
  );
}

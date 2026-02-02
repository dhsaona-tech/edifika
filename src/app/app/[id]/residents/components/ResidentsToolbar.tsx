"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ExportResidentsButton from "./ExportResidentsButton";

export default function ResidentsToolbar({ condominiumId }: { condominiumId: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const query = searchParams.get("query") || "";
  const role = searchParams.get("role") || "all";
  const hasUnit = searchParams.get("hasUnit") || "all";

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    replace(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters = role !== "all" || hasUnit !== "all";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("role");
    params.delete("hasUnit");
    replace(`${pathname}?${params.toString()}`);
    setOpen(false);
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm
          focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
          placeholder="Buscar residente..."
          defaultValue={query}
          onChange={(e) => updateParam("query", e.target.value)}
        />
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border transition-all shadow-sm
            ${hasActiveFilters ? "border-brand text-brand bg-brand/5" : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50"}`}
          title="Filtros"
        >
          <SlidersHorizontal size={14} />
          <span className="hidden sm:inline">Filtros</span>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-2">
            <div className="px-4 py-2 border-b border-gray-100 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Filtros residentes
            </div>
            <div className="p-3 space-y-3 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase font-semibold text-gray-500 tracking-wide">
                  Rol
                </label>
                <select
                  className="w-full rounded-md border border-gray-200 bg-white py-2 px-3 text-sm text-gray-800 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/10"
                  value={role}
                  onChange={(e) => updateParam("role", e.target.value === "all" ? undefined : e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="owner">Propietarios</option>
                  <option value="tenant">Inquilinos</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase font-semibold text-gray-500 tracking-wide">
                  Unidad asignada
                </label>
                <select
                  className="w-full rounded-md border border-gray-200 bg-white py-2 px-3 text-sm text-gray-800 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/10"
                  value={hasUnit}
                  onChange={(e) => updateParam("hasUnit", e.target.value === "all" ? undefined : e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="yes">Con unidad</option>
                  <option value="no">Sin unidad</option>
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className={`inline-flex items-center gap-1 px-3 py-2 rounded-md border text-xs font-semibold transition-all
                    ${hasActiveFilters ? "border-brand text-brand bg-brand/5 hover:bg-brand/10" : "border-gray-200 text-gray-500 bg-white hover:bg-gray-50"}`}
                >
                  <X size={14} />
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ExportResidentsButton condominiumId={condominiumId} />
    </div>
  );
}

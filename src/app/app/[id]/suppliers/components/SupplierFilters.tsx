"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ExportSuppliersButton from "./ExportSuppliersButton";

type ExpenseItem = { id: string; name: string };

interface Props {
  expenseItems: ExpenseItem[];
  condominiumId: string;
}

export default function SupplierFilters({ expenseItems, condominiumId }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const query = searchParams.get("q") || "";
  const state = searchParams.get("state") || "active";
  const expenseItemId = searchParams.get("expenseItemId") || "";
  const fiscalId = searchParams.get("fiscalId") || "";

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    replace(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("q");
    params.delete("state");
    params.delete("expenseItemId");
    params.delete("fiscalId");
    replace(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters =
    query !== "" || state !== "active" || expenseItemId !== "" || fiscalId !== "";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-transparent">
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm
          focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
          placeholder="Buscar por nombre, comercial o identificación"
          defaultValue={query}
          onChange={(e) => updateParam("q", e.target.value)}
        />
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border shadow-sm transition-all
            ${hasActiveFilters ? "border-brand text-brand bg-brand/5" : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50"}`}
        >
          <SlidersHorizontal size={14} />
          Filtros
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-[360px] bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-2">
            <div className="px-4 py-2 border-b border-gray-100 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Filtros avanzados
            </div>

            <div className="p-3 grid grid-cols-1 gap-3 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase font-semibold text-gray-500 tracking-wide">
                  Estado
                </label>
                <select
                  className="w-full rounded-md border border-gray-200 bg-white py-2 px-3 text-sm text-gray-800 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/10"
                  value={state}
                  onChange={(e) =>
                    updateParam(
                      "state",
                      e.target.value === "active"
                        ? "active"
                        : e.target.value === "inactive"
                        ? "inactive"
                        : undefined
                    )
                  }
                >
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                  <option value="all">Todos</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase font-semibold text-gray-500 tracking-wide">
                  Rubro principal
                </label>
                <select
                  className="w-full rounded-md border border-gray-200 bg-white py-2 px-3 text-sm text-gray-800 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/10"
                  value={expenseItemId}
                  onChange={(e) => updateParam("expenseItemId", e.target.value || undefined)}
                >
                  <option value="">Todos</option>
                  {expenseItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase font-semibold text-gray-500 tracking-wide">
                  Identificación exacta
                </label>
                <input
                  className="w-full rounded-md border border-gray-200 bg-white py-2 px-3 text-sm text-gray-800 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/10"
                  placeholder="RUC / Cédula / Pasaporte"
                  defaultValue={fiscalId}
                  onChange={(e) => updateParam("fiscalId", e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    clearFilters();
                    setOpen(false);
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-2 rounded-md border text-xs font-semibold transition-all
                    ${hasActiveFilters ? "border-brand text-brand bg-brand/5 hover:bg-brand/10" : "border-gray-200 text-gray-500 bg-white hover:bg-gray-50"}`}
                >
                  <X size={14} />
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botón de descarga funcional */}
      <ExportSuppliersButton condominiumId={condominiumId} />
    </div>
  );
}

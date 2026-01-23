"use client";

import { SlidersHorizontal, Check, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function UnitsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Tipos disponibles (Hardcoded por ahora, idealmente vendrían de config)
  const types = [
    { value: "todos", label: "Todos" },
    { value: "departamento", label: "Departamentos" },
    { value: "casa", label: "Casas" },
    { value: "parqueadero", label: "Parqueaderos" },
    { value: "bodega", label: "Bodegas" },
    { value: "local", label: "Locales" },
  ];

  const currentFilter = searchParams.get("type") || "todos";

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "todos") {
      params.delete("type");
    } else {
      params.set("type", value);
    }
    router.push(`?${params.toString()}`);
    setIsOpen(false);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("type");
    router.push(`?${params.toString()}`);
    setIsOpen(false);
  };

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border transition-all shadow-sm
            ${isOpen || currentFilter !== "todos"
              ? "bg-brand/5 border-brand text-brand"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}
        >
          <SlidersHorizontal size={14} />
          <span>Filtros</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
              Filtrar por tipo
            </div>
            {types.map((t) => (
              <button
                key={t.value}
                onClick={() => handleSelect(t.value)}
                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-brand flex items-center justify-between group"
              >
                <span>{t.label}</span>
                {currentFilter === t.value && <Check size={12} className="text-brand" />}
              </button>
            ))}
            <div className="px-3 py-2 border-t border-gray-100">
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <X size={12} /> Limpiar filtros
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

type Props = {
  expenseItems: Option[];
  units: Option[];
  currentStatus?: string;
};

const statusOptions = [
  { value: "pendiente", label: "Pendiente" },
  { value: "parcialmente_pagado", label: "Parcialmente pagado" },
  { value: "pagado", label: "Pagado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "eliminado", label: "Eliminado" },
  { value: "todos", label: "Todos" },
];

export default function ChargesFilters({ expenseItems, units, currentStatus }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const expenseItemId = searchParams.get("expenseItemId") || "";
  const unitId = searchParams.get("unitId") || "";
  const period = searchParams.get("period") || "";
  const status = currentStatus || searchParams.get("status") || "pendiente";

  const handleChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "todos") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  // Generar opciones de periodo (últimos 12 meses + próximos 3)
  const generatePeriodOptions = () => {
    const options: { value: string; label: string }[] = [];
    const today = new Date();
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    for (let i = -12; i <= 3; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const value = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const label = `${meses[month]} ${year}`;
      options.push({ value, label });
    }

    return options.reverse();
  };

  const periodOptions = generatePeriodOptions();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-4 items-end">
      {/* Estado */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Estado</label>
        <select
          className="border border-gray-200 rounded-md px-3 py-2 text-sm min-w-[160px]"
          value={status}
          onChange={(e) => handleChange("status", e.target.value)}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Periodo */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Periodo</label>
        <select
          className="border border-gray-200 rounded-md px-3 py-2 text-sm min-w-[160px]"
          value={period}
          onChange={(e) => handleChange("period", e.target.value)}
        >
          <option value="">Todos</option>
          {periodOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Rubro */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Rubro</label>
        <select
          className="border border-gray-200 rounded-md px-3 py-2 text-sm min-w-[180px]"
          value={expenseItemId}
          onChange={(e) => handleChange("expenseItemId", e.target.value)}
        >
          <option value="">Todos</option>
          {expenseItems.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {/* Unidad */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Unidad</label>
        <select
          className="border border-gray-200 rounded-md px-3 py-2 text-sm min-w-[160px]"
          value={unitId}
          onChange={(e) => handleChange("unitId", e.target.value)}
        >
          <option value="">Todas</option>
          {units.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>

      {/* Botón limpiar filtros */}
      {(status !== "pendiente" || period || expenseItemId || unitId) && (
        <button
          type="button"
          onClick={() => router.push("?")}
          className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

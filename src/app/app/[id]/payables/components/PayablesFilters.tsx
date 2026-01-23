"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import DatePicker from "@/components/ui/DatePicker";

type Option = { value: string; label: string };

type Props = {
  suppliers: Option[];
  expenseItems: Option[];
};

export default function PayablesFilters({ suppliers, expenseItems }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") || "";
  const supplierId = searchParams.get("supplierId") || "";
  const expenseItemId = searchParams.get("expenseItemId") || "";
  const initialFrom = searchParams.get("from") || "";
  const initialTo = searchParams.get("to") || "";
  const search = searchParams.get("search") || "";

  const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const handleChange = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  };

  const clear = () => router.push(pathname);

  const hasFilters =
    status || supplierId || expenseItemId || from || to || search;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase font-semibold text-gray-500">Filtros</p>
          <h3 className="text-lg font-semibold text-gray-900">Cuentas por pagar</h3>
        </div>
        {hasFilters && (
          <button
            onClick={clear}
            className="text-xs text-brand font-semibold hover:underline"
            type="button"
          >
            Limpiar
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <input
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          placeholder="Buscar por factura o detalle"
          value={search}
          onChange={(e) => handleChange("search", e.target.value || undefined)}
        />
        <select
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          value={status}
          onChange={(e) => handleChange("status", e.target.value || undefined)}
        >
          <option value="">Estado</option>
          <option value="pendiente_pago">Pendiente de pago</option>
          <option value="parcialmente_pagado">Parcialmente pagado</option>
          <option value="pagado">Pagado</option>
          <option value="borrador">Borrador</option>
          <option value="anulado">Anulado</option>
        </select>
        <select
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          value={supplierId}
          onChange={(e) => handleChange("supplierId", e.target.value || undefined)}
        >
          <option value="">Proveedor</option>
          {suppliers.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          value={expenseItemId}
          onChange={(e) => handleChange("expenseItemId", e.target.value || undefined)}
        >
          <option value="">Rubro</option>
          {expenseItems.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <DatePicker
          value={from}
          onChange={(v) => {
            setFrom(v);
            handleChange("from", v || undefined);
          }}
        />
        <DatePicker
          value={to}
          onChange={(v) => {
            setTo(v);
            handleChange("to", v || undefined);
          }}
        />
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import DatePicker from "@/components/ui/DatePicker";

type Option = { value: string; label: string };

type Props = {
  suppliers: Option[];
  accounts: Option[];
};

export default function EgressesFilters({ suppliers, accounts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") || "";
  const supplierId = searchParams.get("supplierId") || "";
  const accountId = searchParams.get("accountId") || "";
  const method = searchParams.get("method") || "";
  const search = searchParams.get("search") || "";
  const [date, setDate] = useState(searchParams.get("date") || "");

  const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);

  const handleChange = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  };

  const clear = () => router.push(pathname);

  const hasFilters = status || supplierId || accountId || method || date || search;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase font-semibold text-gray-500">Filtros</p>
          <h3 className="text-lg font-semibold text-gray-900">Egresos</h3>
        </div>
        {hasFilters && (
          <button onClick={clear} className="text-xs text-brand font-semibold hover:underline" type="button">
            Limpiar
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <input
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          placeholder="Buscar ref/nota"
          value={search}
          onChange={(e) => handleChange("search", e.target.value || undefined)}
        />
        <select
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          value={status}
          onChange={(e) => handleChange("status", e.target.value || undefined)}
        >
          <option value="">Estado</option>
          <option value="disponible">Disponible</option>
          <option value="anulado">Anulado</option>
        </select>
        <select
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          value={method}
          onChange={(e) => handleChange("method", e.target.value || undefined)}
        >
          <option value="">Metodo</option>
          <option value="cheque">Cheque</option>
          <option value="transferencia">Transferencia</option>
          <option value="efectivo">Efectivo</option>
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
          value={accountId}
          onChange={(e) => handleChange("accountId", e.target.value || undefined)}
        >
          <option value="">Cuenta</option>
          {accounts.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <DatePicker
          value={date}
          onChange={(v) => {
            setDate(v);
            handleChange("date", v || undefined);
          }}
        />
      </div>
    </div>
  );
}

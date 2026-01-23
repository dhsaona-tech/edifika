"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import DatePicker from "@/components/ui/DatePicker";
import { paymentMethodOptions } from "@/lib/payments/schemas";

type Option = { value: string; label: string };

type Props = {
  accounts: Option[];
  units: Option[];
  rubros: Option[];
};

export default function PaymentsFilters({ accounts, units, rubros }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const method = searchParams.get("method") || "";
  const status = searchParams.get("status") || "";
  const accountId = searchParams.get("accountId") || "";
  const unitId = searchParams.get("unitId") || "";
  const expenseItemId = searchParams.get("expenseItemId") || "";
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");

  const handleChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-4 items-end">
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Estado</label>
        <select
          className="border border-gray-200 rounded-md px-3 py-2 text-sm min-w-[140px]"
          value={status}
          onChange={(e) => handleChange("status", e.target.value)}
        >
          <option value="">Todos</option>
          <option value="disponible">Disponible</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Metodo</label>
        <select
          className="border border-gray-200 rounded-md px-3 py-2 text-sm min-w-[160px]"
          value={method}
          onChange={(e) => handleChange("method", e.target.value)}
        >
          <option value="">Todos</option>
          {paymentMethodOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Cuenta</label>
        <select
          className="border border-gray-200 rounded-md px-3 py-2 text-sm min-w-[180px]"
          value={accountId}
          onChange={(e) => handleChange("accountId", e.target.value)}
        >
          <option value="">Todas</option>
          {accounts.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>
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
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Rubro directo</label>
        <select
          className="border border-gray-200 rounded-md px-3 py-2 text-sm min-w-[180px]"
          value={expenseItemId}
          onChange={(e) => handleChange("expenseItemId", e.target.value)}
        >
          <option value="">Todos</option>
          {rubros.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Desde</label>
        <DatePicker
          value={from}
          onChange={(v) => {
            setFrom(v);
            handleChange("from", v);
          }}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Hasta</label>
        <DatePicker
          value={to}
          onChange={(v) => {
            setTo(v);
            handleChange("to", v);
          }}
        />
      </div>
    </div>
  );
}

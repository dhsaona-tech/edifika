"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

type Props = {
  expenseItems: Option[];
  units: Option[];
};

export default function ChargesFilters({ expenseItems, units }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const expenseItemId = searchParams.get("expenseItemId") || "";
  const unitId = searchParams.get("unitId") || "";

  const handleChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-4 items-end">
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
    </div>
  );
}

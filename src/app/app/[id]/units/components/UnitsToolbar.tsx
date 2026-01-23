"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import UnitsFilter from "./UnitsFilter";
import ExportUnitsButton from "./ExportUnitsButton";

export default function UnitsToolbar({ condominiumId }: { condominiumId: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm
          focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
          placeholder="Buscar..."
          defaultValue={searchParams.get("query")?.toString() || ""}
          onChange={(e) => {
            const paramsSearch = new URLSearchParams(searchParams);
            if (e.target.value) {
              paramsSearch.set("query", e.target.value);
            } else {
              paramsSearch.delete("query");
            }
            replace(`${pathname}?${paramsSearch.toString()}`);
          }}
        />
      </div>
      <UnitsFilter />
      <ExportUnitsButton condominiumId={condominiumId} />
    </div>
  );
}

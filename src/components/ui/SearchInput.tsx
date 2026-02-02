"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce"; 

export default function SearchInput({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <div className="relative flex flex-1 flex-shrink-0 group w-full">
      <label htmlFor="search" className="sr-only">Buscar</label>
      
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 group-focus-within:text-brand transition-colors duration-300" />
      
      <input
        // AJUSTE: h-8 (32px), text-xs, bordes más suaves, igual que en Unidades
        className="peer block w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 
        shadow-sm transition-all duration-200
        hover:border-gray-300 
        focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none h-8"
        placeholder={placeholder}
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get("query")?.toString()}
      />
    </div>
  );
}
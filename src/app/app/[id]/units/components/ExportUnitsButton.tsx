"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function ExportUnitsButton({ condominiumId }: { condominiumId: string }) {
  const searchParams = useSearchParams();

  const params = new URLSearchParams();
  params.set("condominiumId", condominiumId);
  const q = searchParams.get("query");
  const type = searchParams.get("type");
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  const href = `/api/units/export?${params.toString()}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border border-brand/70 bg-brand text-white hover:bg-brand/90 transition-all shadow-sm"
      title="Descargar CSV de unidades (filtros actuales)"
    >
      <Download size={14} />
      Descargar
    </a>
  );
}

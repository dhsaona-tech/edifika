"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function ExportSuppliersButton({ condominiumId }: { condominiumId: string }) {
  const searchParams = useSearchParams();

  const params = new URLSearchParams();
  params.set("condominiumId", condominiumId);
  const q = searchParams.get("q");
  const state = searchParams.get("state");
  const expenseItemId = searchParams.get("expenseItemId");
  const fiscalId = searchParams.get("fiscalId");
  if (q) params.set("q", q);
  if (state) params.set("state", state);
  if (expenseItemId) params.set("expenseItemId", expenseItemId);
  if (fiscalId) params.set("fiscalId", fiscalId);
  const href = `/api/suppliers/export?${params.toString()}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border border-brand/70 bg-brand text-white hover:bg-brand/90 transition-all shadow-sm"
      title="Descargar CSV de proveedores (filtros actuales)"
    >
      <Download size={14} />
      Descargar
    </a>
  );
}

"use client";

import { Printer } from "lucide-react";

type Props = {
  condominiumId: string;
  payableId: string;
};

export default function PrintDraftButton({ condominiumId, payableId }: Props) {
  const handlePrint = () => {
    // Abrir el PDF del borrador en una nueva pestaña
    window.open(`/api/payables/${payableId}/draft?condominiumId=${condominiumId}`, "_blank");
  };

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-2 rounded-md bg-slate-200 text-gray-800 px-4 py-2 text-xs font-semibold shadow-sm hover:bg-slate-300"
    >
      <Printer size={14} />
      Imprimir borrador
    </button>
  );
}

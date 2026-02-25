"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

interface Props {
  condominiumId: string;
  unitId: string;
  filters: { from?: string; to?: string; status?: string };
}

export default function PrintButton({ condominiumId, unitId, filters }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("condominiumId", condominiumId);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.status) params.set("status", filters.status);

      const url = `/api/units/${unitId}/estado-cuenta/pdf?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.details || "Error generando PDF");
      }

      const blob = await response.blob();
      const pdfUrl = URL.createObjectURL(blob);

      // Abrir en nueva pestaña (el usuario puede imprimir o descargar desde ahí)
      window.open(pdfUrl, "_blank");
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert(error instanceof Error ? error.message : "Error al generar el estado de cuenta. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <FileDown size={16} />
          Estado de Cuenta PDF
        </>
      )}
    </button>
  );
}

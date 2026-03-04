"use client";

import { useState } from "react";
import { Share2, Check, Loader2, Link2 } from "lucide-react";

interface ShareEstadoCuentaButtonProps {
  unitId: string;
  condominiumId: string;
}

export default function ShareEstadoCuentaButton({
  unitId,
  condominiumId,
}: ShareEstadoCuentaButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "copied" | "error">(
    "idle"
  );

  const handleShare = async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/units/${unitId}/public-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condominiumId, expiryDays: 30 }),
      });

      if (!res.ok) {
        throw new Error("Error generando enlace");
      }

      const data = await res.json();

      await navigator.clipboard.writeText(data.url);
      setState("copied");

      setTimeout(() => setState("idle"), 3000);
    } catch (err) {
      console.error("Error compartiendo estado de cuenta:", err);
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={state === "loading"}
      className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded font-semibold text-[11px] transition-colors ${
        state === "copied"
          ? "bg-green-100 text-green-700 border border-green-300"
          : state === "error"
            ? "bg-red-100 text-red-700 border border-red-300"
            : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
      }`}
      title="Genera un link público válido por 30 días"
    >
      {state === "loading" && (
        <>
          <Loader2 size={12} className="animate-spin" /> Generando...
        </>
      )}
      {state === "idle" && (
        <>
          <Link2 size={12} /> Compartir Estado de Cuenta
        </>
      )}
      {state === "copied" && (
        <>
          <Check size={12} /> Link copiado al portapapeles
        </>
      )}
      {state === "error" && (
        <>
          <Share2 size={12} /> Error — intenta de nuevo
        </>
      )}
    </button>
  );
}

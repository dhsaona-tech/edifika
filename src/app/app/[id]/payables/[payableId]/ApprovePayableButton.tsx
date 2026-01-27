"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approvePayable } from "../actions";

export default function ApprovePayableButton({
  condominiumId,
  payableId,
}: {
  condominiumId: string;
  payableId: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    const result = await approvePayable(condominiumId, payableId);
    setIsLoading(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    alert("✅ Orden de pago aprobada correctamente. Se asignó el folio automáticamente.");
    setShowConfirm(false);
    router.refresh();
  };

  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
          <h3 className="text-lg font-semibold">¿Aprobar orden de pago?</h3>
          <p className="text-sm text-gray-600">
            Al aprobar esta OP se asignará un folio automáticamente y quedará lista para registrar el pago.
          </p>
          <p className="text-sm text-gray-600 font-semibold">
            Una vez aprobada, no podrás editar el monto ni el proveedor.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Cancelar
            </button>
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold bg-brand text-white rounded-md hover:bg-brand-dark disabled:opacity-50"
            >
              {isLoading ? "Aprobando..." : "Sí, aprobar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 text-white px-4 py-2 text-xs font-semibold shadow-sm hover:bg-emerald-700"
    >
      ✓ Aprobar OP
    </button>
  );
}
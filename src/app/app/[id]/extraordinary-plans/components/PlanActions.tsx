"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { approveExtraordinaryPlan, cancelExtraordinaryPlan } from "../actions";

interface Props {
  condominiumId: string;
  planId: string;
  status: string;
  hasQuotations: boolean;
}

export default function PlanActions({ condominiumId, planId, status, hasQuotations }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const handleApprove = () => {
    if (!hasQuotations) {
      setError("Debes subir al menos una cotizacion antes de aprobar el proyecto");
      return;
    }

    if (!confirm("¿Aprobar este proyecto? Se generaran los cargos para todas las unidades.")) {
      return;
    }

    startTransition(async () => {
      const result = await approveExtraordinaryPlan(condominiumId, planId);

      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleCancel = () => {
    if (!cancelReason.trim()) {
      setError("Ingresa el motivo de cancelacion");
      return;
    }

    startTransition(async () => {
      const result = await cancelExtraordinaryPlan(condominiumId, planId, cancelReason);

      if (result.error) {
        setError(result.error);
      } else {
        setShowCancelModal(false);
        router.refresh();
      }
    });
  };

  if (status !== "borrador" && status !== "activo") {
    return null;
  }

  return (
    <>
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm shadow-lg z-50 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      <div className="flex gap-2">
        {status === "borrador" && (
          <>
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm disabled:opacity-50"
            >
              <CheckCircle size={16} />
              {isPending ? "Aprobando..." : "Aprobar y Generar Cargos"}
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={isPending}
              className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              <XCircle size={16} />
              Cancelar
            </button>
          </>
        )}

        {status === "activo" && (
          <button
            onClick={() => setShowCancelModal(true)}
            disabled={isPending}
            className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            <XCircle size={16} />
            Cancelar Proyecto
          </button>
        )}
      </div>

      {/* Modal de cancelacion */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Cancelar Proyecto</h3>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                {status === "activo"
                  ? "Se cancelaran todos los cargos pendientes asociados a este proyecto."
                  : "El proyecto sera cancelado y no se podra activar."}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Motivo de cancelacion *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Ingresa el motivo..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Volver
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending || !cancelReason.trim()}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle size={16} />
                {isPending ? "Cancelando..." : "Confirmar Cancelacion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

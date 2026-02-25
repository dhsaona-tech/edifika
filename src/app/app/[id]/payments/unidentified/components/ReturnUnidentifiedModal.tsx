"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { markUnidentifiedAsReturned } from "../../actions";

type UnidentifiedPayment = {
  id: string;
  payment_date: string;
  amount: number;
  reference_number: string | null;
  bank_reference: string | null;
};

type Props = {
  payment: UnidentifiedPayment;
  condominiumId: string;
  onClose: () => void;
};

export default function ReturnUnidentifiedModal({ payment, condominiumId, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const handleReturn = () => {
    if (!reason.trim()) {
      setError("Ingresa el motivo de la devolución.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await markUnidentifiedAsReturned(condominiumId, payment.id, reason);

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Marcar como devuelto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Vas a marcar este depósito como devuelto
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Esto indica que el dinero fue devuelto al depositante porque no se pudo identificar
                al propietario. Esta acción no puede deshacerse.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Ref: {payment.reference_number || payment.bank_reference || "—"}
                </p>
                <p className="text-xs text-gray-500">Fecha: {payment.payment_date}</p>
              </div>
              <div className="text-lg font-bold text-gray-900">{formatCurrency(payment.amount)}</div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Motivo de la devolución *
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: No se logró identificar al depositante después de múltiples intentos..."
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancelar
          </button>
          <button
            onClick={handleReturn}
            disabled={isPending}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-md hover:bg-amber-700 disabled:opacity-60"
          >
            {isPending ? "Procesando..." : "Marcar como devuelto"}
          </button>
        </div>
      </div>
    </div>
  );
}

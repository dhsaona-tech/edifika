"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X, AlertTriangle } from "lucide-react";
import { deletePayable } from "../actions";

type Props = {
  condominiumId: string;
  payableId: string;
  invoiceNumber: string;
};

export default function DeletePayableButton({ condominiumId, payableId, invoiceNumber }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deletePayable(condominiumId, payableId);

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      // Redirigir al listado
      router.push(`/app/${condominiumId}/payables`);
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-rose-50 text-rose-700 px-4 py-2 text-xs font-semibold shadow-sm border border-rose-200 hover:bg-rose-100"
      >
        <Trash2 size={14} />
        Eliminar
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Eliminar cuenta por pagar</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <AlertTriangle size={20} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-800">
                    ¿Estás seguro de eliminar esta cuenta por pagar?
                  </p>
                  <p className="text-xs text-rose-600 mt-1">
                    Esta acción eliminará permanentemente el registro de "{invoiceNumber}".
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t bg-gray-50">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-md hover:bg-rose-700 disabled:opacity-60"
              >
                {isPending ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

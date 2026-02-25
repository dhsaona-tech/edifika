"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { canDeleteFinancialAccount, deleteFinancialAccount } from "../actions";
import { Trash2, X, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

type Props = {
  condominiumId: string;
  accountId: string;
  accountName: string;
};

export default function DeleteAccountButton({ condominiumId, accountId, accountName }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isChecking, setIsChecking] = useState(false);
  const [canDelete, setCanDelete] = useState<boolean | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = async () => {
    setIsOpen(true);
    setIsChecking(true);
    setError(null);

    // Verificar si se puede eliminar
    const result = await canDeleteFinancialAccount(condominiumId, accountId);
    setCanDelete(result.canDelete);
    setBlockers(result.blockers);
    setIsChecking(false);
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteFinancialAccount(condominiumId, accountId);

      if (result.error) {
        setError(result.error);
        return;
      }

      setIsOpen(false);
      router.refresh();
    });
  };

  const closeModal = () => {
    setIsOpen(false);
    setCanDelete(null);
    setBlockers([]);
    setError(null);
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        title="Eliminar cuenta"
      >
        <Trash2 size={16} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Eliminar Cuenta</h3>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {isChecking ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  <span className="ml-2 text-gray-500">Verificando...</span>
                </div>
              ) : canDelete ? (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-emerald-800">
                          Esta cuenta puede ser desactivada
                        </p>
                        <p className="text-sm text-emerald-700 mt-1">
                          No tiene movimientos, pagos ni egresos asociados.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      ¿Estás seguro de desactivar la cuenta{" "}
                      <span className="font-semibold">{accountName}</span>?
                    </p>
                    <p className="text-xs text-amber-600 mt-2">
                      La cuenta quedará inactiva y no aparecerá en las listas. Puedes reactivarla más tarde.
                    </p>
                  </div>
                </>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">
                        No se puede eliminar esta cuenta
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        La cuenta <span className="font-semibold">{accountName}</span> tiene
                        registros asociados:
                      </p>
                      <ul className="mt-2 space-y-1">
                        {blockers.map((blocker, idx) => (
                          <li key={idx} className="text-sm text-amber-700 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                            {blocker}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-amber-600 mt-3">
                        Puedes desactivar la cuenta en lugar de eliminarla.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                {canDelete ? "Cancelar" : "Cerrar"}
              </button>
              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? "Desactivando..." : "Desactivar Cuenta"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

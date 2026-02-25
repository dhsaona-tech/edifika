"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelEgress, getEgressCheckInfo, CheckCancelAction } from "../actions";
import { XCircle, AlertTriangle, FileX, RotateCcw } from "lucide-react";

type Props = {
  condominiumId: string;
  egressId: string;
  status: string;
};

export default function CancelEgressButton({ condominiumId, egressId, status }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  // Info del cheque asociado
  const [hasCheck, setHasCheck] = useState(false);
  const [checkNumber, setCheckNumber] = useState<number | null>(null);
  const [checkAction, setCheckAction] = useState<CheckCancelAction>("void");
  const [loadingCheckInfo, setLoadingCheckInfo] = useState(false);

  // Si ya está anulado, no mostrar botón
  if (status === "anulado") return null;

  const openModal = async () => {
    setIsOpen(true);
    setError(null);
    setReason("");
    setCheckAction("void");

    // Verificar si tiene cheque asociado
    setLoadingCheckInfo(true);
    const info = await getEgressCheckInfo(condominiumId, egressId);
    setHasCheck(info.hasCheck);
    setCheckNumber(info.check?.checkNumber || null);
    setLoadingCheckInfo(false);
  };

  const handleCancel = () => {
    setError(null);

    startTransition(async () => {
      const result = await cancelEgress(
        condominiumId,
        egressId,
        reason,
        hasCheck ? checkAction : "none"
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      setIsOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-xs font-semibold shadow-sm hover:bg-red-100 transition-colors"
      >
        <XCircle size={14} />
        Anular egreso
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-red-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Anular Egreso</h3>
                  <p className="text-xs text-gray-500">Esta acción es irreversible</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {loadingCheckInfo ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  Verificando información...
                </div>
              ) : (
                <>
                  {/* Motivo de anulación */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase mb-1.5 block">
                      Motivo de anulación
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-red-400 focus:ring-red-400/20 focus:ring-2 transition-all"
                      rows={2}
                      placeholder="Ej: Error en monto, cheque dañado, duplicado..."
                    />
                  </div>

                  {/* Opciones de cheque si aplica */}
                  {hasCheck && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <p className="text-sm font-semibold text-amber-800">
                          Este egreso usó el cheque #{checkNumber?.toString().padStart(6, "0")}
                        </p>
                      </div>
                      <p className="text-xs text-amber-700">
                        ¿Qué deseas hacer con el cheque físico?
                      </p>

                      <div className="space-y-2">
                        <label className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-white cursor-pointer hover:bg-amber-50 transition-colors">
                          <input
                            type="radio"
                            name="checkAction"
                            value="void"
                            checked={checkAction === "void"}
                            onChange={() => setCheckAction("void")}
                            className="mt-0.5 text-red-600 focus:ring-red-500"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <FileX size={14} className="text-red-600" />
                              <span className="text-sm font-semibold text-gray-800">Anular cheque</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              El cheque fue firmado/entregado y debe quedar como "Anulado físicamente".
                              No volverá a la lista de disponibles.
                            </p>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-white cursor-pointer hover:bg-amber-50 transition-colors">
                          <input
                            type="radio"
                            name="checkAction"
                            value="release"
                            checked={checkAction === "release"}
                            onChange={() => setCheckAction("release")}
                            className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <RotateCcw size={14} className="text-emerald-600" />
                              <span className="text-sm font-semibold text-gray-800">Liberar cheque</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              El cheque físico NO fue firmado/entregado. Volverá a la lista de disponibles
                              para ser usado en otro egreso.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Advertencia */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600">
                      <strong>Importante:</strong> Al anular este egreso:
                    </p>
                    <ul className="text-xs text-gray-500 mt-1 list-disc list-inside space-y-0.5">
                      <li>Se revertirán los pagos asignados a las OPs</li>
                      <li>Las OPs volverán a estado "aprobada" o "parcialmente pagado"</li>
                      <li>El saldo de la cuenta bancaria NO se ajusta automáticamente</li>
                    </ul>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending || loadingCheckInfo}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isPending ? (
                  "Anulando..."
                ) : (
                  <>
                    <XCircle size={14} />
                    Confirmar anulación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

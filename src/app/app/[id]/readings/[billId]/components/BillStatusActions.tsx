"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markAsClosed,
  reopenBill,
  generateCharges,
  deleteBill,
} from "../../actions";
import type { UtilityBillWithReadings } from "@/types/readings";
import { Lock, Unlock, Receipt, Trash2, AlertTriangle } from "lucide-react";

const statusConfig: Record<string, { bg: string; label: string }> = {
  draft: { bg: "bg-amber-50 text-amber-700 border border-amber-200", label: "Borrador" },
  closed: { bg: "bg-blue-50 text-blue-700 border border-blue-200", label: "Cerrado" },
  billed: { bg: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "Facturado" },
};

export default function BillStatusActions({
  bill,
  condominiumId,
}: {
  bill: UtilityBillWithReadings;
  condominiumId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState<"close" | "generate" | "delete" | null>(null);

  const status = statusConfig[bill.status] || statusConfig.draft;

  const handleAction = (action: () => Promise<{ success?: boolean; error?: string }>) => {
    setMessage(null);
    setShowConfirm(null);
    startTransition(async () => {
      const res = await action();
      if ("error" in res && res.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: "Acción completada exitosamente." });
      }
    });
  };

  // Resumen para confirmación de cargos
  const readingsWithConsumption = bill.utility_readings.filter(
    (r) => r.current_reading - r.previous_reading > 0
  );
  const totalChargeAmount = bill.utility_readings.reduce(
    (acc, r) => acc + r.calculated_amount,
    0
  );

  return (
    <div className="space-y-3">
      {/* Status badge + actions row */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.bg}`}>
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* DRAFT actions */}
          {bill.status === "draft" && (
            <>
              <button
                onClick={() => setShowConfirm("close")}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 text-xs font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Lock size={13} />
                Cerrar Lectura
              </button>
              <button
                onClick={() => setShowConfirm("delete")}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 text-red-500 hover:text-red-700 px-3 py-2 text-xs font-medium border border-red-200 rounded-md hover:bg-red-50 transition-colors"
              >
                <Trash2 size={13} />
                Eliminar
              </button>
            </>
          )}

          {/* CLOSED actions */}
          {bill.status === "closed" && (
            <>
              <button
                onClick={() => handleAction(() => reopenBill(condominiumId, bill.id))}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-800 px-3 py-2 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Unlock size={13} />
                Reabrir
              </button>
              <button
                onClick={() => setShowConfirm("generate")}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 text-xs font-semibold rounded-md shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <Receipt size={13} />
                Generar Cargos
              </button>
            </>
          )}

          {/* BILLED info */}
          {bill.status === "billed" && (
            <a
              href={`/app/${condominiumId}/charges`}
              className="inline-flex items-center gap-1.5 text-brand hover:text-brand-dark px-3 py-2 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Receipt size={13} />
              Ver Cargos
            </a>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Confirmation modals */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-xl w-full max-w-md border border-gray-200 shadow-2xl p-6 space-y-4">
            {showConfirm === "close" && (
              <>
                <div className="flex items-center gap-2 text-blue-700">
                  <Lock size={18} />
                  <h3 className="text-base font-bold">Cerrar Lectura</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Al cerrar la lectura, ya no podrás editar los valores. Se habilitará
                  la opción de generar cargos. ¿Deseas continuar?
                </p>
              </>
            )}

            {showConfirm === "generate" && (
              <>
                <div className="flex items-center gap-2 text-emerald-700">
                  <Receipt size={18} />
                  <h3 className="text-base font-bold">Generar Cargos</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Se crearán cargos para{" "}
                  <strong>
                    {bill.mode === "meter_based"
                      ? `${readingsWithConsumption.length} unidades con consumo`
                      : "todas las unidades"}
                  </strong>{" "}
                  por un total de <strong>${totalChargeAmount.toFixed(2)}</strong>.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Esta acción es irreversible. Los cargos se insertarán en la tabla contable.
                    Para corregir, deberás anular cargos individuales desde el módulo de Cargos.
                  </p>
                </div>
              </>
            )}

            {showConfirm === "delete" && (
              <>
                <div className="flex items-center gap-2 text-red-700">
                  <Trash2 size={18} />
                  <h3 className="text-base font-bold">Eliminar Lectura</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Se eliminará permanentemente esta lectura y todas sus lecturas
                  individuales. ¿Estás seguro?
                </p>
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (showConfirm === "close") {
                    handleAction(() => markAsClosed(condominiumId, bill.id));
                  } else if (showConfirm === "generate") {
                    handleAction(() => generateCharges(condominiumId, bill.id));
                  } else if (showConfirm === "delete") {
                    handleAction(async () => {
                      const res = await deleteBill(condominiumId, bill.id);
                      if (!("error" in res)) {
                        router.push(`/app/${condominiumId}/readings`);
                      }
                      return res;
                    });
                  }
                }}
                disabled={isPending}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-md shadow-sm disabled:opacity-50 ${
                  showConfirm === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : showConfirm === "generate"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isPending
                  ? "Procesando..."
                  : showConfirm === "close"
                  ? "Cerrar"
                  : showConfirm === "generate"
                  ? "Generar Cargos"
                  : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

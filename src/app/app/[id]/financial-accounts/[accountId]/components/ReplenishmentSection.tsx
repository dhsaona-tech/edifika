"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createReplenishment,
  executeReplenishment,
  type PettyCashReplenishment,
} from "../../petty-cash-actions";
import { formatCurrency } from "@/lib/utils";
import { RefreshCw, X, CheckCircle, Clock, XCircle, ArrowRight } from "lucide-react";

type BankAccount = {
  id: string;
  bank_name: string;
  account_number: string;
  current_balance: number;
};

type Props = {
  replenishments: PettyCashReplenishment[];
  condominiumId: string;
  accountId: string;
  bankAccounts: BankAccount[];
  pendingVouchersAmount: number;
  pendingVouchersCount: number;
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pendiente: { label: "Pendiente", color: "text-amber-600 bg-amber-50", icon: Clock },
  pagada: { label: "Ejecutada", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle },
  anulada: { label: "Anulada", color: "text-red-600 bg-red-50", icon: XCircle },
};

export default function ReplenishmentSection({
  replenishments,
  condominiumId,
  accountId,
  bankAccounts,
  pendingVouchersAmount,
  pendingVouchersCount,
}: Props) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedSource = bankAccounts.find((a) => a.id === selectedSourceId);
  const canCreate = pendingVouchersCount > 0 && bankAccounts.length > 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  };

  const handleCreate = () => {
    setError(null);

    if (!selectedSourceId) {
      setError("Selecciona la cuenta de origen");
      return;
    }

    if (selectedSource && pendingVouchersAmount > selectedSource.current_balance) {
      setError(`Saldo insuficiente en cuenta origen (${formatCurrency(selectedSource.current_balance)})`);
      return;
    }

    startTransition(async () => {
      const result = await createReplenishment(
        condominiumId,
        accountId,
        selectedSourceId,
        notes.trim() || undefined
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      setIsCreateOpen(false);
      setSelectedSourceId("");
      setNotes("");
      setError(null);
      router.refresh();
    });
  };

  const handleExecute = (replenishmentId: string) => {
    startTransition(async () => {
      const result = await executeReplenishment(condominiumId, replenishmentId);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  };

  // Verificar si hay una reposición pendiente
  const pendingReplenishment = replenishments.find((r) => r.status === "pendiente");

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Reposiciones</h3>
          <p className="text-sm text-gray-500">Historial de reposiciones de caja chica</p>
        </div>
        {!pendingReplenishment && canCreate && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-emerald-700"
          >
            <RefreshCw size={16} />
            Nueva Reposición
          </button>
        )}
      </div>

      {/* Mensaje si hay reposición pendiente */}
      {pendingReplenishment && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-amber-800">Reposición pendiente de ejecutar</p>
              <p className="text-sm text-amber-700 mt-1">
                {pendingReplenishment.vouchers_count} vales por {formatCurrency(pendingReplenishment.total_amount)}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Desde: {pendingReplenishment.source_account?.bank_name} -{" "}
                {pendingReplenishment.source_account?.account_number}
              </p>
            </div>
            <button
              onClick={() => handleExecute(pendingReplenishment.id)}
              disabled={isPending}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? "Ejecutando..." : "Ejecutar Transferencia"}
            </button>
          </div>
        </div>
      )}

      {/* Mensaje si no hay vales pendientes */}
      {!canCreate && !pendingReplenishment && (
        <div className="text-center py-6 text-gray-500 text-sm">
          {pendingVouchersCount === 0
            ? "No hay vales pendientes por reponer"
            : "No hay cuentas bancarias disponibles para reposición"}
        </div>
      )}

      {/* Tabla de reposiciones */}
      {replenishments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Origen</th>
                <th className="px-3 py-2 text-center">Vales</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {replenishments.map((rep) => {
                const config = statusConfig[rep.status] || statusConfig.pendiente;
                const Icon = config.icon;

                return (
                  <tr key={rep.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-gray-600">
                      {formatDate(rep.replenishment_date)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-gray-900">{rep.source_account?.bank_name}</div>
                      <div className="text-xs text-gray-500">{rep.source_account?.account_number}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium text-gray-900">
                      {rep.vouchers_count}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                      {formatCurrency(rep.total_amount)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
                      >
                        <Icon size={12} />
                        {config.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de crear reposición */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-900">Nueva Reposición</h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setSelectedSourceId("");
                  setNotes("");
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Resumen de vales pendientes */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  Se repondrán <span className="font-semibold">{pendingVouchersCount} vales</span> por un
                  total de <span className="font-semibold">{formatCurrency(pendingVouchersAmount)}</span>
                </p>
              </div>

              {/* Cuenta origen */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Cuenta origen *
                </label>
                <select
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                >
                  <option value="">Selecciona una cuenta</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bank_name} - {acc.account_number} ({formatCurrency(acc.current_balance)})
                    </option>
                  ))}
                </select>
                {selectedSource && (
                  <p className="text-xs text-gray-500 mt-1">
                    Saldo disponible: {formatCurrency(selectedSource.current_balance)}
                  </p>
                )}
              </div>

              {/* Visualización de la transferencia */}
              {selectedSource && (
                <div className="flex items-center justify-center gap-3 py-2">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Desde</p>
                    <p className="font-medium text-sm">{selectedSource.bank_name}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Hacia</p>
                    <p className="font-medium text-sm">Caja Chica</p>
                  </div>
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Notas</label>
                <textarea
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas opcionales..."
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setSelectedSourceId("");
                  setNotes("");
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending || !selectedSourceId}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPending ? "Creando..." : "Crear Reposición"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

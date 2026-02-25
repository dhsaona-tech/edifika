"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelPettyCashVoucher, type PettyCashVoucher } from "../../petty-cash-actions";
import { formatCurrency } from "@/lib/utils";
import { Receipt, XCircle, CheckCircle, Clock, X } from "lucide-react";
import VoucherForm from "./VoucherForm";

type ExpenseItem = { id: string; name: string };

type Props = {
  vouchers: PettyCashVoucher[];
  condominiumId: string;
  accountId: string;
  expenseItems: ExpenseItem[];
  availableCash: number;
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pendiente: { label: "Pendiente", color: "text-amber-600 bg-amber-50", icon: Clock },
  repuesto: { label: "Repuesto", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle },
  anulado: { label: "Anulado", color: "text-red-600 bg-red-50", icon: XCircle },
};

export default function PettyCashVouchersTab({
  vouchers,
  condominiumId,
  accountId,
  expenseItems,
  availableCash,
}: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [cancelModal, setCancelModal] = useState<{ id: string; number: number } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filteredVouchers =
    filter === "all" ? vouchers : vouchers.filter((v) => v.status === filter);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  };

  const handleCancel = () => {
    if (!cancelModal || !cancelReason.trim()) {
      setError("Debes ingresar el motivo de anulación");
      return;
    }

    startTransition(async () => {
      const result = await cancelPettyCashVoucher(condominiumId, cancelModal.id, cancelReason.trim());

      if (result.error) {
        setError(result.error);
        return;
      }

      setCancelModal(null);
      setCancelReason("");
      setError(null);
      router.refresh();
    });
  };

  // Calcular totales
  const pendingTotal = vouchers
    .filter((v) => v.status === "pendiente")
    .reduce((sum, v) => sum + v.amount, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Comprobantes de Caja Chica</h3>
          <p className="text-sm text-gray-500">
            {vouchers.filter((v) => v.status === "pendiente").length} pendientes por{" "}
            {formatCurrency(pendingTotal)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="repuesto">Repuestos</option>
            <option value="anulado">Anulados</option>
          </select>
          <VoucherForm
            condominiumId={condominiumId}
            accountId={accountId}
            expenseItems={expenseItems}
            availableCash={availableCash}
          />
        </div>
      </div>

      {filteredVouchers.length === 0 ? (
        <div className="text-center py-8">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No hay comprobantes registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">N°</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-left">Rubro</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2 text-center">Estado</th>
                <th className="px-3 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVouchers.map((voucher) => {
                const config = statusConfig[voucher.status] || statusConfig.pendiente;
                const Icon = config.icon;

                return (
                  <tr key={voucher.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-900">
                      #{voucher.voucher_number.toString().padStart(4, "0")}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {formatDate(voucher.voucher_date)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-gray-900">{voucher.description}</div>
                      {voucher.beneficiary && (
                        <div className="text-xs text-gray-500">{voucher.beneficiary}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {voucher.expense_item?.name || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                      {formatCurrency(voucher.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
                      >
                        <Icon size={12} />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {voucher.status === "pendiente" && (
                        <button
                          onClick={() => setCancelModal({ id: voucher.id, number: voucher.voucher_number })}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Anular
                        </button>
                      )}
                      {voucher.status === "anulado" && voucher.cancellation_reason && (
                        <span className="text-xs text-gray-500" title={voucher.cancellation_reason}>
                          Ver motivo
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredVouchers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 text-right">
          Mostrando {filteredVouchers.length} comprobante(s)
        </div>
      )}

      {/* Modal de anulación */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Anular Comprobante</h3>
              <button
                onClick={() => {
                  setCancelModal(null);
                  setCancelReason("");
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                ¿Estás seguro de anular el comprobante{" "}
                <span className="font-semibold">
                  #{cancelModal.number.toString().padStart(4, "0")}
                </span>
                ?
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Motivo de anulación *
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej: Error en el monto registrado"
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
                  setCancelModal(null);
                  setCancelReason("");
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Anulando..." : "Anular Comprobante"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelPettyCashVoucher, type PettyCashVoucher } from "../../petty-cash-actions";
import { formatCurrency } from "@/lib/utils";
import { Receipt, XCircle, Search, Filter, X, AlertTriangle } from "lucide-react";

type Props = {
  vouchers: PettyCashVoucher[];
  condominiumId: string;
  accountId: string;
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Activo", color: "bg-emerald-100 text-emerald-700" },
  repuesto: { label: "Repuesto", color: "bg-blue-100 text-blue-700" },
  anulado: { label: "Anulado", color: "bg-red-100 text-red-700" },
};

export default function SimplePettyCashExpenses({ vouchers, condominiumId, accountId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Filtrar comprobantes
  const filteredVouchers = vouchers.filter((v) => {
    const matchesSearch =
      !searchTerm ||
      v.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.beneficiary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.voucher_number.toString().includes(searchTerm);

    const matchesStatus = statusFilter === "all" || v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Ordenar por número de comprobante descendente (más recientes primero)
  const sortedVouchers = [...filteredVouchers].sort((a, b) => b.voucher_number - a.voucher_number);

  const handleCancel = (voucherId: string) => {
    if (!cancelReason.trim()) {
      setError("Debes ingresar un motivo de anulación");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await cancelPettyCashVoucher(condominiumId, voucherId, cancelReason.trim());

      if (result.error) {
        setError(result.error);
        return;
      }

      setCancelingId(null);
      setCancelReason("");
      router.refresh();
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Gastos / Comprobantes</h3>
          <span className="text-sm text-gray-500">({vouchers.filter(v => v.status !== "anulado").length})</span>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-md text-sm w-48"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="all">Todos</option>
            <option value="pendiente">Activos</option>
            <option value="repuesto">Repuestos</option>
            <option value="anulado">Anulados</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Descripción</th>
              <th className="px-4 py-2 text-left">Beneficiario</th>
              <th className="px-4 py-2 text-left">Rubro</th>
              <th className="px-4 py-2 text-right">Monto</th>
              <th className="px-4 py-2 text-center">Estado</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedVouchers.map((v) => {
              const config = statusConfig[v.status] || statusConfig.pendiente;

              return (
                <tr key={v.id} className={`hover:bg-gray-50/70 ${v.status === "anulado" ? "opacity-60" : ""}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-600">
                    {v.voucher_number.toString().padStart(4, "0")}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{formatDate(v.voucher_date)}</td>
                  <td className="px-4 py-2.5 text-gray-800 max-w-xs truncate" title={v.description}>
                    {v.description}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{v.beneficiary || "-"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{v.expense_item?.name || "-"}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                    {formatCurrency(v.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {v.status === "pendiente" && (
                      <button
                        onClick={() => {
                          setCancelingId(v.id);
                          setCancelReason("");
                          setError(null);
                        }}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Anular comprobante"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                    {v.status === "anulado" && v.cancellation_reason && (
                      <span className="text-xs text-gray-400" title={v.cancellation_reason}>
                        {v.cancellation_reason.slice(0, 20)}...
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {sortedVouchers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  {vouchers.length === 0
                    ? "No hay gastos registrados aún"
                    : "No se encontraron gastos con los filtros aplicados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de anulación */}
      {cancelingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Anular Comprobante</h3>
              </div>
              <button
                onClick={() => {
                  setCancelingId(null);
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
                ¿Estás seguro de anular este comprobante? Esta acción no se puede deshacer.
              </p>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Motivo de anulación *
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej: Error de registro, duplicado..."
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
                  setCancelingId(null);
                  setCancelReason("");
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleCancel(cancelingId)}
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

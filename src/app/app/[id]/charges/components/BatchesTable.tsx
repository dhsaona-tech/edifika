"use client";

import { useState, useTransition } from "react";
import { ChargeBatch } from "@/types/charges";
import { formatCurrency } from "@/lib/utils";
import { eliminarLoteCompleto } from "../actions";
import { Trash2, Loader2, Package, AlertTriangle } from "lucide-react";

type Props = {
  batches: ChargeBatch[];
  condominiumId: string;
};

const typeLabels: Record<string, string> = {
  expensas_mensuales: "Expensas Mensuales",
  servicio_basico: "Servicio Básico",
  extraordinaria_masiva: "Extraordinaria Masiva",
  saldo_inicial: "Saldo Inicial",
};

const statusStyles: Record<string, string> = {
  activo: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  eliminado: "bg-red-50 text-red-700 border border-red-200",
};

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  const meses = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];
  return `${meses[Number(month) - 1]} ${year}`;
}

export default function BatchesTable({ batches, condominiumId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (batchId: string, batchDescription: string) => {
    const confirm = window.confirm(
      `¿Eliminar el lote "${batchDescription || "Sin descripción"}"?\n\nEsto eliminará TODOS los cargos del lote. Esta acción no se puede deshacer.`
    );
    if (!confirm) return;

    setMessage(null);
    setDeletingId(batchId);

    startTransition(async () => {
      const result = await eliminarLoteCompleto(condominiumId, batchId);
      setDeletingId(null);

      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({
          type: "success",
          text: `Lote eliminado. ${result.eliminados} cargo(s) marcados como eliminados.`,
        });
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.type === "error" && <AlertTriangle size={16} />}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Rubro</th>
              <th className="px-4 py-3 text-left">Periodo</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-center">Cargos</th>
              <th className="px-4 py-3 text-right">Monto Total</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {batches.map((batch) => {
              const isDeleting = deletingId === batch.id;
              const isEliminado = batch.status === "eliminado";

              return (
                <tr
                  key={batch.id}
                  className={`hover:bg-gray-50/60 ${isEliminado ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(batch.created_at).toLocaleDateString("es-EC", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-gray-400" />
                      <span className="font-medium text-gray-800">
                        {typeLabels[batch.type] || batch.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {batch.expense_item?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {batch.period ? formatPeriod(batch.period) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                    {batch.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold text-xs">
                      {batch.charges_count ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {batch.total_amount != null ? formatCurrency(batch.total_amount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                        statusStyles[batch.status || "activo"] || statusStyles.activo
                      }`}
                    >
                      {batch.status === "eliminado" ? "Eliminado" : "Activo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isEliminado && (
                      <button
                        onClick={() => handleDelete(batch.id, batch.description || batch.type)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-50 disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {batches.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={9}>
                  No hay lotes registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

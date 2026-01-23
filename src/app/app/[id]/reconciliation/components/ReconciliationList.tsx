"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { deleteReconciliation } from "../actions";
import type { Reconciliation } from "@/types/reconciliation";
import type { FinancialAccount } from "@/types/financial";

type Props = {
  condominiumId: string;
  reconciliations: (Reconciliation & { financial_account?: FinancialAccount | null })[];
  onSelect: (reconciliationId: string) => void;
  onCreateNew: () => void;
};

export default function ReconciliationList({
  condominiumId,
  reconciliations,
  onSelect,
  onCreateNew,
}: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (reconciliationId: string) => {
    const recon = reconciliations.find((r) => r.id === reconciliationId);
    const statusText = recon?.status === "conciliada" ? "conciliada" : "en borrador";
    
    if (!confirm(`¿Estás seguro de borrar esta conciliación ${statusText}? Esta acción no se puede deshacer y se perderán todos los movimientos seleccionados.`)) {
      return;
    }

    setDeletingId(reconciliationId);
    const result = await deleteReconciliation(condominiumId, reconciliationId);
    if (result.error) {
      alert(result.error);
    } else {
      // Recargar la página para actualizar la lista
      window.location.reload();
    }
    setDeletingId(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatShortDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Conciliaciones</h2>
        <button
          onClick={onCreateNew}
          className="bg-brand hover:bg-brand/90 text-white px-4 py-2 rounded-md text-sm font-semibold"
        >
          Nueva Conciliación
        </button>
      </div>

      {reconciliations.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No hay conciliaciones registradas.</p>
          <button
            onClick={onCreateNew}
            className="mt-4 bg-brand hover:bg-brand/90 text-white px-4 py-2 rounded-md text-sm font-semibold"
          >
            Crear Primera Conciliación
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 text-[11px] uppercase tracking-wide text-gray-600 font-bold">
                <tr>
                  <th className="px-4 py-3">Fecha de corte</th>
                  <th className="px-4 py-3">Caja o Banco</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3 text-right">Saldo Calculado</th>
                  <th className="px-4 py-3 text-right">Saldo Real en Banco</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reconciliations.map((recon) => {
                  const account = recon.financial_account;
                  
                  // Determinar estado basado en diferencia
                  // Si hay diferencia significativa, es PENDIENTE (naranja)
                  // Si no hay diferencia y está conciliada, es CONCILIADO (verde)
                  // Si está en borrador, es BORRADOR (amarillo)
                  const hasDifference = Math.abs(recon.difference) >= 0.01;
                  const isReconciled = recon.status === "conciliada";
                  
                  let statusText: string;
                  let statusColor: string;
                  
                  if (recon.status === "cerrada") {
                    statusText = "CERRADO";
                    statusColor = "bg-gray-100 text-gray-800";
                  } else if (recon.status === "borrador") {
                    statusText = "BORRADOR";
                    statusColor = "bg-yellow-100 text-yellow-800";
                  } else if (isReconciled && !hasDifference) {
                    statusText = "CONCILIADO";
                    statusColor = "bg-green-100 text-green-800";
                  } else {
                    // Conciliada pero con diferencia = PENDIENTE
                    statusText = "PENDIENTE";
                    statusColor = "bg-orange-100 text-orange-800";
                  }

                  return (
                    <tr key={recon.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-800">
                        {formatShortDate(recon.cutoff_date)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {account?.bank_name || "Cuenta"} - {account?.account_number || ""}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {recon.notes || "Sin detalle"}
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-semibold text-gray-900">
                        {formatCurrency(recon.closing_balance_calculated)}
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-semibold text-gray-900">
                        {formatCurrency(recon.closing_balance_bank)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onSelect(recon.id)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title={recon.status === "borrador" ? "Continuar" : "Ver/Editar"}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {/* Botón de eliminar siempre visible */}
                          <button
                            onClick={() => handleDelete(recon.id)}
                            disabled={deletingId === recon.id}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

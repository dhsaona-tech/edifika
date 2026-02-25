"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, RotateCcw, ExternalLink } from "lucide-react";
import AssignUnidentifiedModal from "./AssignUnidentifiedModal";
import ReturnUnidentifiedModal from "./ReturnUnidentifiedModal";

type UnidentifiedPayment = {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  bank_reference: string | null;
  notes: string | null;
  status: string;
  assigned_payment_id: string | null;
  financial_account?: { bank_name: string; account_number: string } | null;
};

type UnitOption = { value: string; label: string };

type Props = {
  payments: UnidentifiedPayment[];
  condominiumId: string;
  units: UnitOption[];
  showAssignAction?: boolean;
};

const methodLabels: Record<string, string> = {
  transferencia: "Transferencia",
  deposito: "Depósito",
  efectivo: "Efectivo",
  cheque: "Cheque",
  tarjeta: "Tarjeta",
  otros: "Otros",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "pendiente":
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
          Pendiente
        </span>
      );
    case "asignado":
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
          Asignado
        </span>
      );
    case "devuelto":
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
          Devuelto
        </span>
      );
    default:
      return null;
  }
};

export default function UnidentifiedPaymentsTable({
  payments,
  condominiumId,
  units,
  showAssignAction = false,
}: Props) {
  const [assignModalPayment, setAssignModalPayment] = useState<UnidentifiedPayment | null>(null);
  const [returnModalPayment, setReturnModalPayment] = useState<UnidentifiedPayment | null>(null);

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No hay registros en esta categoría.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-right">Monto</th>
              <th className="px-3 py-2 text-left">Método</th>
              <th className="px-3 py-2 text-left">Referencia</th>
              <th className="px-3 py-2 text-left">Cuenta</th>
              <th className="px-3 py-2 text-left">Notas</th>
              <th className="px-3 py-2 text-center">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{p.payment_date}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900">
                  {formatCurrency(p.amount)}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {methodLabels[p.payment_method] || p.payment_method}
                </td>
                <td className="px-3 py-2 text-gray-600 max-w-[150px] truncate">
                  {p.reference_number || p.bank_reference || "—"}
                </td>
                <td className="px-3 py-2 text-gray-600 text-xs">
                  {p.financial_account ? (
                    <>
                      {p.financial_account.bank_name}
                      <br />
                      <span className="text-gray-400">{p.financial_account.account_number}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs max-w-[200px] truncate">
                  {p.notes || "—"}
                </td>
                <td className="px-3 py-2 text-center">{statusBadge(p.status)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {showAssignAction && p.status === "pendiente" && (
                      <>
                        <button
                          onClick={() => setAssignModalPayment(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand hover:text-brand-dark bg-brand/10 hover:bg-brand/20 rounded"
                        >
                          <ArrowRight size={14} />
                          Asignar
                        </button>
                        <button
                          onClick={() => setReturnModalPayment(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded"
                        >
                          <RotateCcw size={14} />
                          Devolver
                        </button>
                      </>
                    )}
                    {p.status === "asignado" && p.assigned_payment_id && (
                      <Link
                        href={`/app/${condominiumId}/payments/${p.assigned_payment_id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded"
                      >
                        <ExternalLink size={14} />
                        Ver recibo
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal para asignar */}
      {assignModalPayment && (
        <AssignUnidentifiedModal
          payment={assignModalPayment}
          condominiumId={condominiumId}
          units={units}
          onClose={() => setAssignModalPayment(null)}
        />
      )}

      {/* Modal para devolver */}
      {returnModalPayment && (
        <ReturnUnidentifiedModal
          payment={returnModalPayment}
          condominiumId={condominiumId}
          onClose={() => setReturnModalPayment(null)}
        />
      )}
    </>
  );
}

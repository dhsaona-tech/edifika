import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { documentTypeLabels } from "@/lib/payables/schemas";

type PayableRow = {
  id: string;
  supplier_id?: string;
  supplier?: { name?: string | null } | null;
  expense_item?: { name?: string | null } | null;
  document_type?: string;
  issue_date: string;
  due_date: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  balance: number | null;
  status: string;
  description?: string | null;
};

const statusColors: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  parcialmente_pagado: "bg-blue-100 text-blue-800",
  pagado: "bg-emerald-100 text-emerald-800",
  anulado: "bg-rose-100 text-rose-800",
};

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  parcialmente_pagado: "Parcial",
  pagado: "Pagado",
  anulado: "Anulado",
};

export default function PayablesTable({ payables, condominiumId }: { payables: PayableRow[]; condominiumId: string }) {
  if (!payables.length) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 bg-white">
        No hay cuentas por pagar.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50/80 text-[11px] uppercase tracking-wide text-gray-600 font-semibold">
          <tr>
            <th className="px-3 py-2">Proveedor</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Número</th>
            <th className="px-3 py-2">Vencimiento</th>
            <th className="px-3 py-2 text-right">Monto</th>
            <th className="px-3 py-2 text-right">Saldo</th>
            <th className="px-3 py-2 text-center">Estado</th>
            <th className="px-3 py-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payables.map((p) => {
            const docType = documentTypeLabels[p.document_type || "factura"] || "Documento";
            const canEdit = p.status === "pendiente" && Number(p.paid_amount || 0) === 0;
            const canPay = ["pendiente", "parcialmente_pagado"].includes(p.status);

            return (
              <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-3 py-2">
                  <p className="text-xs font-semibold text-gray-800">{p.supplier?.name || "--"}</p>
                  <p className="text-[11px] text-gray-500">{p.expense_item?.name || "--"}</p>
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">{docType}</td>
                <td className="px-3 py-2 text-xs text-gray-700 font-medium">{p.invoice_number}</td>
                <td className="px-3 py-2 text-xs text-gray-700">{p.due_date}</td>
                <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                  {formatCurrency(p.total_amount)}
                </td>
                <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                  {formatCurrency(p.balance ?? p.total_amount - (p.paid_amount || 0))}
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      statusColors[p.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {statusLabels[p.status] || p.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Ver detalle */}
                    <Link
                      href={`/app/${condominiumId}/payables/${p.id}`}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand hover:text-brand"
                      title="Ver detalle"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    </Link>

                    {/* Editar (solo si pendiente sin pagos) */}
                    {canEdit && (
                      <Link
                        href={`/app/${condominiumId}/payables/${p.id}/edit`}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand hover:text-brand"
                        title="Editar"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
                          <path d="m12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </Link>
                    )}

                    {/* Imprimir borrador (solo si pendiente) */}
                    {canEdit && (
                      <Link
                        href={`/api/payables/${p.id}/draft?condominiumId=${condominiumId}`}
                        target="_blank"
                        className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand hover:text-brand"
                        title="Imprimir borrador"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
                          <path d="M7 9V3h10v6" />
                          <rect x="7" y="14" width="10" height="7" rx="1" />
                          <rect x="3" y="9" width="18" height="7" rx="2" />
                        </svg>
                      </Link>
                    )}

                    {/* Pagar */}
                    {canPay && (
                      <Link
                        href={`/app/${condominiumId}/payables/pay?supplierId=${p.supplier_id || ""}`}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        title="Registrar pago"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

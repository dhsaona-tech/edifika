import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type PayableRow = {
  id: string;
  supplier_id?: string;
  supplier?: { name?: string | null } | null;
  expense_item?: { name?: string | null } | null;
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
  borrador: "bg-gray-100 text-gray-700",
  pendiente_pago: "bg-amber-100 text-amber-800",
  parcialmente_pagado: "bg-blue-100 text-blue-800",
  pagado: "bg-emerald-100 text-emerald-800",
  anulado: "bg-rose-100 text-rose-800",
};

const statusLabel = (value?: string) => {
  if (!value) return "—";
  return value.replace("_", " ");
};

export default function PayablesTable({ payables, condominiumId }: { payables: PayableRow[]; condominiumId: string }) {
  if (!payables.length) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 bg-white">
        No hay cuentas por pagar pendientes.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50/80 text-[11px] uppercase tracking-wide text-gray-600 font-semibold">
          <tr>
            <th className="px-3 py-2">Proveedor / Rubro</th>
            <th className="px-3 py-2">Factura</th>
            <th className="px-3 py-2">Emision</th>
            <th className="px-3 py-2">Vencimiento</th>
            <th className="px-3 py-2">Detalle</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2 text-right">Saldo</th>
            <th className="px-3 py-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payables.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="px-3 py-2">
                <p className="text-xs font-semibold text-gray-800">{p.supplier?.name || "--"}</p>
                <p className="text-[11px] text-gray-500">{p.expense_item?.name || "--"}</p>
              </td>
              <td className="px-3 py-2 text-xs text-gray-700">{p.invoice_number}</td>
              <td className="px-3 py-2 text-xs text-gray-700">{p.issue_date}</td>
              <td className="px-3 py-2 text-xs text-gray-700">{p.due_date}</td>
              <td className="px-3 py-2 text-xs text-gray-700 truncate max-w-xs">{p.description || "—"}</td>
              <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">{formatCurrency(p.total_amount)}</td>
              <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                {formatCurrency(p.balance ?? p.total_amount - (p.paid_amount || 0))}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/app/${condominiumId}/payables/${p.id}`}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-brand hover:text-brand"
                    aria-label="Ver OP"
                    title="Ver OP"
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  </Link>
                  <Link
                    href={`/app/${condominiumId}/payables/${p.id}/edit`}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-brand hover:text-brand"
                    aria-label="Editar OP"
                    title="Editar OP"
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="m12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </Link>
                  <Link
                    href={`/api/payables/${p.id}/order?condominiumId=${condominiumId}`}
                    target="_blank"
                    className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-brand hover:text-brand"
                    aria-label="Imprimir orden de pago"
                    title="Imprimir orden de pago"
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M7 9V3h10v6" />
                      <rect x="7" y="14" width="10" height="7" rx="1" />
                      <rect x="3" y="9" width="18" height="7" rx="2" />
                      <path d="M17 12h0" />
                    </svg>
                  </Link>
                  <Link
                    href={`/app/${condominiumId}/payables/pay?supplierId=${p.supplier_id || ""}`}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-brand hover:text-brand"
                    aria-label="Pagar OP"
                    title="Pagar OP"
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M5 22h14" />
                      <path d="M5 9h14" />
                      <path d="M5 5h14" />
                      <path d="M10 17h4" />
                      <path d="M2 9a2 2 0 0 0 2-2V5a2 2 0 0 1 2-2" />
                      <path d="M22 9a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2" />
                      <path d="M2 9h20v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" />
                    </svg>
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type EgressRow = {
  id: string;
  folio_eg?: number | null;
  payment_date: string;
  payment_method: string;
  reference_number?: string | null;
  total_amount: number;
  status: string;
  pdf_url?: string | null;
  supplier?: { name?: string | null; fiscal_id?: string | null; bank_name?: string | null; bank_account_number?: string | null } | null;
  account?: { bank_name?: string | null; account_number?: string | null } | null;
};

const statusColors: Record<string, string> = {
  pagado: "bg-emerald-100 text-emerald-800",
  parcialmente_pagado: "bg-amber-100 text-amber-800",
  emitido: "bg-gray-100 text-gray-700",
  disponible: "bg-emerald-100 text-emerald-800",
  anulado: "bg-rose-100 text-rose-800",
};

export default function EgressesTable({ egresses, condominiumId }: { egresses: EgressRow[]; condominiumId: string }) {
  if (!egresses.length) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 bg-white">
        No hay egresos registrados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50/80 text-[11px] uppercase tracking-wide text-gray-600 font-semibold">
          <tr>
            <th className="px-3 py-2"># EG</th>
            <th className="px-3 py-2">Fecha</th>
            <th className="px-3 py-2">Beneficiario</th>
            <th className="px-3 py-2">Cuenta</th>
            <th className="px-3 py-2">Metodo</th>
            <th className="px-3 py-2">Ref</th>
            <th className="px-3 py-2 text-right">Monto</th>
            <th className="px-3 py-2 text-right">Estado</th>
            <th className="px-3 py-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {egresses.map((e) => (
            <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="px-3 py-2 text-xs font-semibold text-gray-800">
                {e.folio_eg ? e.folio_eg.toString().padStart(3, "0") : "—"}
              </td>
              <td className="px-3 py-2 text-xs text-gray-700">{e.payment_date}</td>
              <td className="px-3 py-2 text-xs text-gray-800">
                <p className="font-semibold">{e.supplier?.name || "--"}</p>
                <p className="text-[11px] text-gray-500">{e.supplier?.fiscal_id || ""}</p>
              </td>
              <td className="px-3 py-2 text-xs text-gray-700">
                {e.account?.bank_name
                  ? `${e.account.bank_name} - ${e.account.account_number || ""}`
                  : e.account?.account_number || e.supplier?.bank_account_number || "--"}
              </td>
              <td className="px-3 py-2 text-xs text-gray-700">{e.payment_method || "--"}</td>
              <td className="px-3 py-2 text-xs text-gray-700">{e.reference_number || "--"}</td>
              <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">{formatCurrency(e.total_amount)}</td>
              <td className="px-3 py-2 text-right">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColors[(e as any).derivedStatus || e.status] || "bg-gray-100 text-gray-700"}`}
                >
                  {(e as any).derivedStatus || e.status}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/api/egresses/${e.id}/pdf?condominiumId=${condominiumId}`}
                    target="_blank"
                    className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-brand hover:text-brand"
                    aria-label="Ver o descargar PDF de egreso"
                    title="Ver o descargar PDF de egreso"
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
                      <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </Link>
                  <Link
                    href={`/app/${condominiumId}/egresses/${e.id}`}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-brand hover:text-brand"
                    aria-label="Ver egreso"
                    title="Ver egreso"
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

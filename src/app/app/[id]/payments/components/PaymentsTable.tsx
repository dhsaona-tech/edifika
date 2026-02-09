import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type PaymentRow = {
  id: string;
  payment_date: string;
  payment_method?: string | null;
  reference_number?: string | null;
  attachment_url?: string | null;
  folio_rec?: number | null;
  total_amount: number;
  financial_account?: { bank_name?: string | null; account_number?: string | null } | null;
  unit?: { full_identifier?: string | null; identifier?: string | null } | null;
  payer?: { full_name?: string | null } | null;
};

const formatUnit = (value?: string | null) => {
  if (!value) return "--";
  if (value.toLowerCase().startsWith("departamento")) {
    return `Departamento${value.slice("departamento".length)}`;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatAccount = (bank?: string | null, number?: string | null) => {
  if (!bank) return "Cuenta";
  return number ? `${bank} - ${number}` : bank;
};

export default function PaymentsTable({ payments, condominiumId }: { payments: PaymentRow[]; condominiumId: string }) {
  if (!payments.length) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 bg-white">
        No hay ingresos registrados. Crea uno para comenzar.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50/80 text-[11px] uppercase tracking-wide text-gray-600 font-bold">
          <tr>
            <th className="px-6 py-3 text-center">N° Recibo</th>
            <th className="px-6 py-3">Fecha</th>
            <th className="px-6 py-3">Unidad</th>
            <th className="px-6 py-3">Residente</th>
            <th className="px-6 py-3">Cuenta</th>
            <th className="px-6 py-3">Método</th>
            <th className="px-6 py-3">Referencia</th>
            <th className="px-6 py-3 text-right">Monto pagado</th>
            <th className="px-6 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="px-6 py-3 text-center text-xs font-mono font-semibold text-gray-800">
                {p.folio_rec !== null && p.folio_rec !== undefined ? p.folio_rec.toString().padStart(4, "0") : "--"}
              </td>
              <td className="px-6 py-3 text-xs text-gray-800 font-semibold">{p.payment_date}</td>
              <td className="px-6 py-3 text-xs text-gray-700">
                {formatUnit(p.unit?.full_identifier || p.unit?.identifier)}
              </td>
              <td className="px-6 py-3 text-xs text-gray-700">{p.payer?.full_name || "--"}</td>
              <td className="px-6 py-3 text-xs text-gray-700">
                {formatAccount(p.financial_account?.bank_name, p.financial_account?.account_number)}
              </td>
              <td className="px-6 py-3 text-xs text-gray-700">{p.payment_method || "--"}</td>
              <td className="px-6 py-3 text-xs text-gray-700">{p.reference_number || "--"}</td>
              <td className="px-6 py-3 text-xs text-right font-semibold text-gray-900">
                {formatCurrency(p.total_amount)}
              </td>
              <td className="px-6 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {p.attachment_url ? (
                    <a
                      href={p.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-brand hover:text-brand"
                      aria-label="Ver comprobante"
                      title="Ver comprobante"
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
                        <path d="M21 15V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10" />
                        <path d="M3 17h18" />
                        <path d="M7 17v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
                        <path d="M10 9h4" />
                        <path d="M9 13h6" />
                      </svg>
                    </a>
                  ) : (
                    <div
                      className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-dashed border-gray-200 text-gray-300"
                      aria-label="Sin comprobante"
                      title="Sin comprobante"
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
                        <path d="M21 15V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10" />
                        <path d="M3 17h18" />
                        <path d="M7 17v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
                        <path d="M10 9h4" />
                        <path d="M9 13h6" />
                      </svg>
                    </div>
                  )}
                  <Link
                    href={`/app/${condominiumId}/payments/${p.id}`}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-brand hover:text-brand"
                    aria-label="Ver ingreso"
                    title="Ver ingreso"
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
                    href={`/api/payments/${p.id}/receipt?condominiumId=${condominiumId}`}
                    target="_blank"
                    className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-brand hover:text-brand"
                    aria-label="Imprimir recibo"
                    title="Imprimir recibo"
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

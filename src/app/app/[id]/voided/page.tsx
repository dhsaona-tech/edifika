import Link from "next/link";
import { listarPaymentsAnulados } from "../payments/actions";
import { formatCurrency } from "@/lib/utils";

type PageProps = { params: { id: string } | Promise<{ id: string }> };

export default async function VoidedPage({ params }: PageProps) {
  const resolved = await params;
  const condominiumId = resolved.id;

  const cancelledIncomes = await listarPaymentsAnulados(condominiumId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Anulados</h1>
          <p className="text-sm text-gray-600">Ingresos anulados (no aparecen en los listados principales).</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600 font-semibold">
            <tr>
              <th className="px-3 py-2 text-center">N° Recibo</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Unidad</th>
              <th className="px-3 py-2">Residente</th>
              <th className="px-3 py-2">Cuenta</th>
              <th className="px-3 py-2">Método</th>
              <th className="px-3 py-2">Referencia</th>
              <th className="px-3 py-2">Motivo</th>
              <th className="px-3 py-2 text-right">Monto</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cancelledIncomes.map((p) => {
              const folio = p.folio_rec !== null && p.folio_rec !== undefined ? p.folio_rec.toString().padStart(4, "0") : "--";
              const unidad = p.unit?.full_identifier || p.unit?.identifier || "--";
              const residente = p.payer?.full_name || "--";
              const cuenta = p.financial_account?.bank_name
                ? `${p.financial_account.bank_name}${p.financial_account.account_number ? ` - ${p.financial_account.account_number}` : ""}`
                : "Cuenta";
              return (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 text-center font-mono text-xs font-semibold text-gray-800">{folio}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{p.payment_date}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{unidad}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{residente}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{cuenta}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{p.payment_method || "--"}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{p.reference_number || "--"}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{(p as any).cancellation_reason || "--"}</td>
                  <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                    {formatCurrency(p.total_amount || 0)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/app/${condominiumId}/voided/${p.id}`}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-brand hover:text-brand"
                        aria-label="Ver ingreso anulado"
                        title="Ver ingreso anulado"
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
                        aria-label="Imprimir recibo anulado"
                        title="Imprimir recibo anulado"
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
              );
            })}
            {!cancelledIncomes.length && (
              <tr>
                <td colSpan={10} className="px-3 py-4 text-center text-sm text-gray-500">
                  No hay ingresos anulados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-500">
        Egresos anulados: pendiente de activar cuando esté disponible el módulo de egresos.
      </div>
    </div>
  );
}

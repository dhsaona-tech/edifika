import Link from "next/link";
import { listarPaymentsAnulados } from "../payments/actions";
import { listEgressesAnulados } from "../egresses/actions";
import { formatCurrency } from "@/lib/utils";

type PageProps = { params: { id: string } | Promise<{ id: string }> };

export default async function VoidedPage({ params }: PageProps) {
  const resolved = await params;
  const condominiumId = resolved.id;

  const [cancelledIncomes, cancelledEgresses] = await Promise.all([
    listarPaymentsAnulados(condominiumId),
    listEgressesAnulados(condominiumId),
  ]);

  const formatDate = (date: string | null) => {
    if (!date) return "--";
    return new Date(date).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Documentos Anulados</h1>
          <p className="text-sm text-gray-600">
            Historial de ingresos y egresos anulados. Estos documentos mantienen su folio para auditoría.
          </p>
        </div>
      </div>

      {/* Ingresos Anulados */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <h2 className="text-lg font-semibold text-gray-800">Ingresos Anulados (REC)</h2>
          <span className="text-sm text-gray-500">({cancelledIncomes.length})</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-red-50 text-xs uppercase text-red-800 font-semibold">
              <tr>
                <th className="px-3 py-2 text-center">N° Recibo</th>
                <th className="px-3 py-2">Fecha Pago</th>
                <th className="px-3 py-2">Fecha Anulación</th>
                <th className="px-3 py-2">Unidad</th>
                <th className="px-3 py-2">Residente</th>
                <th className="px-3 py-2">Cuenta</th>
                <th className="px-3 py-2">Método</th>
                <th className="px-3 py-2">Motivo Anulación</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cancelledIncomes.map((p: any) => {
                const folio = p.folio_rec !== null && p.folio_rec !== undefined
                  ? `REC-${p.folio_rec.toString().padStart(4, "0")}`
                  : "--";
                const unidad = p.unit?.full_identifier || p.unit?.identifier || "--";
                const residente = p.payer?.full_name || "--";
                const cuenta = p.financial_account?.bank_name
                  ? `${p.financial_account.bank_name}${p.financial_account.account_number ? ` - ${p.financial_account.account_number}` : ""}`
                  : "Cuenta";
                return (
                  <tr key={p.id} className="hover:bg-red-50/30">
                    <td className="px-3 py-2 text-center">
                      <span className="font-mono text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        {folio}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">{formatDate(p.payment_date)}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{formatDate(p.cancelled_at)}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{unidad}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{residente}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{cuenta}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{p.payment_method || "--"}</td>
                    <td className="px-3 py-2 text-xs text-red-600 max-w-[200px] truncate" title={p.cancellation_reason}>
                      {p.cancellation_reason || "--"}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900 line-through">
                      {formatCurrency(p.total_amount || 0)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/app/${condominiumId}/voided/${p.id}`}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-brand hover:text-brand"
                          title="Ver detalle"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                        </Link>
                        <Link
                          href={`/api/payments/${p.id}/receipt?condominiumId=${condominiumId}&voided=true`}
                          target="_blank"
                          className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-red-500 hover:text-red-500"
                          title="Imprimir recibo anulado"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                  <td colSpan={10} className="px-3 py-8 text-center text-sm text-gray-500">
                    No hay ingresos anulados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Egresos Anulados */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <h2 className="text-lg font-semibold text-gray-800">Egresos Anulados (EG)</h2>
          <span className="text-sm text-gray-500">({cancelledEgresses.length})</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-orange-50 text-xs uppercase text-orange-800 font-semibold">
              <tr>
                <th className="px-3 py-2 text-center">N° Egreso</th>
                <th className="px-3 py-2">Fecha Pago</th>
                <th className="px-3 py-2">Fecha Anulación</th>
                <th className="px-3 py-2">Proveedor</th>
                <th className="px-3 py-2">Cuenta</th>
                <th className="px-3 py-2">Método</th>
                <th className="px-3 py-2">Motivo Anulación</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cancelledEgresses.map((e: any) => {
                const folio = e.folio_eg !== null && e.folio_eg !== undefined
                  ? `EG-${e.folio_eg.toString().padStart(4, "0")}`
                  : "--";
                const proveedor = e.supplier?.name || "--";
                const cuenta = e.account?.bank_name
                  ? `${e.account.bank_name}${e.account.account_number ? ` - ${e.account.account_number}` : ""}`
                  : "Cuenta";
                return (
                  <tr key={e.id} className="hover:bg-orange-50/30">
                    <td className="px-3 py-2 text-center">
                      <span className="font-mono text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                        {folio}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">{formatDate(e.payment_date)}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{formatDate(e.cancelled_at)}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{proveedor}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{cuenta}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{e.payment_method || "--"}</td>
                    <td className="px-3 py-2 text-xs text-orange-600 max-w-[200px] truncate" title={e.cancellation_reason}>
                      {e.cancellation_reason || "--"}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900 line-through">
                      {formatCurrency(e.total_amount || 0)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/app/${condominiumId}/egresses/${e.id}`}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-brand hover:text-brand"
                          title="Ver detalle"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                        </Link>
                        <Link
                          href={`/api/egresses/${e.id}/pdf?condominiumId=${condominiumId}&voided=true`}
                          target="_blank"
                          className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-orange-500 hover:text-orange-500"
                          title="Imprimir egreso anulado"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
              {!cancelledEgresses.length && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-sm text-gray-500">
                    No hay egresos anulados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium">Nota sobre documentos anulados:</p>
            <ul className="mt-1 list-disc list-inside text-xs space-y-1">
              <li>Los documentos anulados mantienen su número de folio original para mantener la secuencia contable.</li>
              <li>Al anular un ingreso, los saldos de los cargos afectados se revierten automáticamente.</li>
              <li>Al anular un egreso, las cuentas por pagar vuelven a su estado pendiente.</li>
              <li>Los PDFs de documentos anulados incluyen una marca de agua "ANULADO".</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { getPaymentDetail } from "../../payments/actions";
import { formatCurrency } from "@/lib/utils";

type PageProps = { params: { id: string; paymentId: string } | Promise<{ id: string; paymentId: string }> };

export default async function VoidedDetailPage({ params }: PageProps) {
  const resolved = await params;
  const condominiumId = resolved.id;
  const paymentId = resolved.paymentId;

  const payment = await getPaymentDetail(condominiumId, paymentId);
  if (!payment || payment.status !== "cancelado") {
    return (
      <div className="space-y-4">
        <Link href={`/app/${condominiumId}/voided`} className="text-sm text-brand underline">
          Volver a anulados
        </Link>
        <div className="bg-white border border-gray-200 rounded-lg p-4">Ingreso no encontrado o no anulado.</div>
      </div>
    );
  }

  const folioLabel = payment.folio_rec !== null && payment.folio_rec !== undefined ? payment.folio_rec.toString().padStart(4, "0") : "--";
  const unitLabel = payment.unit?.full_identifier || payment.unit?.identifier || "-";
  const payerName = payment.payer?.full_name || "-";
  const accountName = payment.financial_account?.bank_name || "-";
  const accountNumber = payment.financial_account?.account_number || "-";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900">Ingreso anulado</h1>
          <div className="text-lg font-semibold text-slate-900">Recibí de: {payerName}</div>
          <div className="flex flex-col text-sm text-gray-600 gap-0.5">
            <span>Generado el {payment.payment_date}</span>
            <span>Método {payment.payment_method || "-"}</span>
            <span>Cuenta {accountName}</span>
            <span>No. cuenta {accountNumber}</span>
          </div>
          <div className="text-sm text-red-700 font-semibold">Motivo de anulación: {(payment as any).cancellation_reason || "—"}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link href={`/app/${condominiumId}/voided`} className="text-sm font-semibold text-brand hover:text-brand-dark">
            Volver a anulados
          </Link>
          <div className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-4 py-1 text-sm font-semibold text-red-700 uppercase">
            Anulado
          </div>
          <div className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-4 py-1 text-sm font-semibold text-brand">
            Recibo #{folioLabel}
          </div>
          <Link
            href={`/api/payments/${paymentId}/receipt?condominiumId=${condominiumId}`}
            target="_blank"
            className="text-xs font-semibold text-brand hover:text-brand-dark px-2 py-1 rounded-md border border-brand/40 inline-flex items-center gap-1"
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
            Imprimir
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-700">
          <div className="col-span-1 md:col-span-2 border-r border-slate-100 pr-4">
            <p className="text-xs uppercase text-gray-500 font-semibold">Monto total</p>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(payment.total_amount)}</p>
            <p className="text-xs text-gray-500 mt-1">Saldo pendiente: {formatCurrency(payment.remaining_balance || 0)}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase text-gray-500 font-semibold">Unidad</p>
            <p className="font-semibold text-slate-900">{unitLabel}</p>
            <p className="text-xs uppercase text-gray-500 font-semibold mt-2">Residente / Contacto</p>
            <p className="font-semibold text-slate-900">{payerName}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase text-gray-500 font-semibold">Referencia</p>
            <div className="flex items-center gap-3">
              <p className="font-semibold text-slate-900">{payment.reference_number || "-"}</p>
            </div>
            <p className="text-xs uppercase text-gray-500 font-semibold mt-2">Estado</p>
            <p className="font-semibold text-red-700">Anulado</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Detalle de asignaciones</h3>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Concepto / Rubro</th>
                <th className="px-3 py-2 text-left">Detalle</th>
                <th className="px-3 py-2 text-left">Periodo</th>
                <th className="px-3 py-2 text-left">Vence</th>
                <th className="px-3 py-2 text-right">Asignado</th>
                <th className="px-3 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(payment.allocations || []).map((a: any) => {
                const concepto = a.charge?.expense_item?.name || a.charge?.description || a.charge?.id || "-";
                const rawDetail =
                  a.charge?.description && a.charge?.description !== a.charge?.expense_item?.name
                    ? a.charge?.description
                    : a.charge?.expense_item?.name || "-";
                const detail = (() => {
                  const parts = (rawDetail || "").split(" - ").map((p: string) => p.trim()).filter(Boolean);
                  if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) return parts[0];
                  return rawDetail || "-";
                })();
                return (
                  <tr key={a.id}>
                    <td className="px-3 py-2 text-xs text-gray-800 font-semibold">{concepto}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{detail}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{a.charge?.period || "-"}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{a.charge?.due_date || "-"}</td>
                    <td className="px-3 py-2 text-xs text-right text-gray-800 font-semibold">
                      {formatCurrency(a.amount_allocated)}
                    </td>
                    <td className="px-3 py-2 text-xs text-right text-gray-700">
                      {formatCurrency(a.charge?.balance || 0)}
                    </td>
                  </tr>
                );
              })}
              {!(payment.allocations || []).length && (
                <tr>
                  <td className="px-4 py-4 text-center text-sm text-gray-500" colSpan={6}>
                    Este ingreso no tiene asignaciones (ingreso directo).
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-3 py-2 text-right text-xs font-semibold text-gray-700" colSpan={4}>
                  Total asignado:
                </td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">
                  {formatCurrency(payment.allocated_amount || 0)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

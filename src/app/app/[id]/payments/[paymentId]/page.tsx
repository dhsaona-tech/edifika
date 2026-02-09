import Link from "next/link";
import { cancelPayment, getPaymentDetail } from "../actions";
import { formatCurrency } from "@/lib/utils";

type PageParams = { id: string; paymentId: string };
type PageProps = { params: PageParams | Promise<PageParams>; searchParams?: Record<string, string> };

export default async function PaymentDetailPage({ params, searchParams }: PageProps) {
  const resolved = await params;
  const condominiumId = resolved.id;
  const paymentId = resolved.paymentId;
  const fromParam = await searchParams;
  const fromValue = fromParam?.from;
  const fromVoided = fromValue === "voided" || fromValue === "voided=1" || fromValue === "1";

  const payment = await getPaymentDetail(condominiumId, paymentId);
  if (!payment) {
    return (
      <div className="space-y-4">
        <Link href={`/app/${condominiumId}/payments`} className="text-sm text-brand underline">
          Volver a ingresos
        </Link>
        <div className="bg-white border border-gray-200 rounded-lg p-4">No se encontró el ingreso.</div>
      </div>
    );
  }

  async function onCancel(formData: FormData) {
    "use server";
    const reason = formData.get("reason")?.toString() || "";
    await cancelPayment(condominiumId, paymentId, reason);
  }

  const allocations = (payment.allocations || []) as {
    id: string;
    amount_allocated: number;
    charge?: {
      id: string;
      unit_id?: string | null;
      period?: string | null;
      description?: string | null;
      due_date?: string | null;
      total_amount?: number | null;
      balance?: number | null;
      expense_item?: { name?: string | null } | null;
    } | null;
  }[];

  const folioLabel =
    payment.folio_rec !== null && payment.folio_rec !== undefined
      ? payment.folio_rec.toString().padStart(4, "0")
      : "--";

  const rawUnit = payment.unit?.full_identifier || payment.unit?.identifier || "-";
  const unitLabel =
    rawUnit === "-"
      ? "-"
      : rawUnit.replace(/^departamento/i, "Departamento").startsWith("Departamento")
      ? rawUnit.replace(/^departamento/i, "Departamento")
      : `Departamento ${rawUnit}`;
  const payerName = payment.payer?.full_name || "-";
  const accountName = payment.financial_account?.bank_name || "-";
  const accountNumber = payment.financial_account?.account_number || "-";
  const saldoPendiente = Number(payment.remaining_balance || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900">Ingreso</h1>
          <div className="text-lg font-semibold text-slate-900">Recibi de: {payerName}</div>
          <div className="flex flex-col text-sm text-gray-600 gap-0.5">
            <span>Generado el {payment.payment_date}</span>
            <span>Metodo {payment.payment_method || "-"}</span>
            <span>Cuenta {accountName}</span>
            <span>No. cuenta {accountNumber}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href={fromVoided ? `/app/${condominiumId}/voided` : `/app/${condominiumId}/payments`}
            className="text-sm font-semibold text-brand hover:text-brand-dark"
          >
            {fromVoided ? "Volver a anulados" : "Volver al listado"}
          </Link>
          {payment.status === "cancelado" && (
            <div className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-4 py-1 text-sm font-semibold text-red-700 uppercase">
              Anulado
            </div>
          )}
          <div className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-4 py-1 text-sm font-semibold text-brand">
            Recibo #{folioLabel}
          </div>
          <Link
            href={`/api/payments/${paymentId}/receipt?condominiumId=${condominiumId}`}
            target="_blank"
            className="text-xs font-semibold text-brand hover:text-brand-dark px-2 py-1 rounded-md border border-brand/40 inline-flex items-center gap-1"
          >
            <span role="img" aria-label="print">🖨️</span>
            Imprimir
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-700">
          <div className="col-span-1 md:col-span-2 border-r border-slate-100 pr-4">
            <p className="text-xs uppercase text-gray-500 font-semibold">Monto total</p>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(payment.total_amount)}</p>
            <p className="text-xs text-gray-500 mt-1">Saldo pendiente: {formatCurrency(saldoPendiente)}</p>
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
            {payment.notes && (
              <>
                <p className="text-xs uppercase text-gray-500 font-semibold mt-2">Notas</p>
                <p className="font-semibold text-slate-900">{payment.notes}</p>
              </>
            )}
            <div className="mt-3 space-y-1">
              <p className="text-xs uppercase text-gray-500 font-semibold">Comprobante</p>
              {payment.attachment_url ? (
                <a
                  href={payment.attachment_url}
                  target="_blank"
                  className="text-sm font-semibold text-brand hover:text-brand-dark underline"
                  rel="noreferrer"
                >
                  Ver imagen del pago
                </a>
              ) : (
                <span className="text-sm text-gray-500">No hay comprobante cargado.</span>
              )}
            </div>
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
              {allocations.map((a) => {
                const concepto = a.charge?.expense_item?.name || a.charge?.description || a.charge?.id || "-";
                const rawDetail =
                  a.charge?.description && a.charge?.description !== a.charge?.expense_item?.name
                    ? a.charge?.description
                    : "";
                const detail = (() => {
                  if (!rawDetail) return "-";
                  const parts = rawDetail.split(" - ").map((p) => p.trim()).filter(Boolean);
                  if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
                    return parts[0];
                  }
                  return rawDetail;
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
              {!allocations.length && (
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

      {payment.status !== "cancelado" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Anular ingreso</h3>
          <p className="text-xs text-gray-600">Esto revertirá saldos contables y no se podrá deshacer.</p>
          <form action={onCancel} className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-gray-600 block">
              Motivo
              <input
                name="reason"
                required
                className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                placeholder="Ej: pago duplicado o asignado incorrectamente"
              />
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm"
              >
                Anular pago
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

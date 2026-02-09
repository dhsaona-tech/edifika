import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getPayableDetail } from "../actions";
import ApprovePayableButton from "./ApprovePayableButton";

type PageProps = { params: { id: string; payableId: string } | Promise<{ id: string; payableId: string }> };

export default async function PayableDetailPage({ params }: PageProps) {
  const resolved = await params;
  const condominiumId = resolved.id;
  const payableId = resolved.payableId;

  const payable = await getPayableDetail(condominiumId, payableId);
  if (!payable) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 bg-white">
        No se encontró la OP.
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    borrador: "bg-gray-100 text-gray-700",
    pendiente_aprobacion: "bg-amber-100 text-amber-800",
    aprobada: "bg-blue-100 text-blue-800",
    pendiente_pago: "bg-amber-100 text-amber-800",
    parcialmente_pagado: "bg-blue-100 text-blue-800",
    pagado: "bg-emerald-100 text-emerald-800",
    anulado: "bg-rose-100 text-rose-800",
  };

  const plannedMethod =
    (payable.notes || "")
      .split("|")
      .map((s: string) => s.trim().toLowerCase())
      .find((s: string) => s.startsWith("pago previsto")) || null;
  const plannedRef =
    (payable.notes || "")
      .split("|")
      .map((s: string) => s.trim().toLowerCase())
      .find((s: string) => s.startsWith("ref:")) || null;

  // Determinar si se puede aprobar
  const canApprove = payable.status === "pendiente_aprobacion";
  const canPay = payable.status === "aprobada";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase font-semibold text-gray-500">Orden de pago</p>
          <h1 className="text-2xl font-semibold">
            {payable.folio_op ? `OP-${String(payable.folio_op).padStart(3, '0')} · ` : ''}
            Factura {payable.invoice_number}
          </h1>
          <p className="text-sm text-gray-500">
            Proveedor: {payable.supplier?.name || "-"} · Rubro: {payable.expense_item?.name || "-"}
          </p>
        </div>
        <div className="flex gap-2">
          {canApprove && (
            <ApprovePayableButton 
              condominiumId={condominiumId} 
              payableId={payableId} 
            />
          )}
          {payable.folio_op && (
            <Link
              href={`/api/payables/${payable.id}/order?condominiumId=${condominiumId}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-md bg-slate-200 text-gray-800 px-4 py-2 text-xs font-semibold shadow-sm hover:bg-slate-300"
            >
              Imprimir orden
            </Link>
          )}
          {canApprove && (
            <Link
              href={`/app/${condominiumId}/payables/${payable.id}/edit`}
              className="inline-flex items-center gap-2 rounded-md bg-white text-gray-800 px-4 py-2 text-xs font-semibold shadow-sm border border-gray-200 hover:border-brand hover:text-brand"
            >
              Editar
            </Link>
          )}
          {canPay && (
            <Link
              href={`/app/${condominiumId}/payables/pay?supplierId=${payable.supplier_id}`}
              className="inline-flex items-center gap-2 rounded-md bg-brand text-white px-4 py-2 text-xs font-semibold shadow-sm hover:bg-brand-dark"
            >
              Registrar pago
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">Proveedor</p>
              <p className="text-sm font-semibold text-gray-900">{payable.supplier?.name || "--"}</p>
              <p className="text-xs text-gray-500">{payable.expense_item?.name || "--"}</p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColors[payable.status] || "bg-gray-100 text-gray-700"}`}
            >
              {payable.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-700">
            <div>
              <p className="text-xs font-semibold text-gray-500">Factura</p>
              <p>{payable.invoice_number}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Emision</p>
              <p>{payable.issue_date}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Vencimiento</p>
              <p>{payable.due_date}</p>
            </div>
          </div>
          {payable.folio_op && (
            <div className="text-sm text-gray-700">
              <p className="text-xs font-semibold text-gray-500">Folio OP</p>
              <p className="font-mono font-semibold">OP-{String(payable.folio_op).padStart(3, '0')}</p>
            </div>
          )}
          {payable.description && (
            <div className="text-sm text-gray-700">
              <p className="text-xs font-semibold text-gray-500">Detalle</p>
              <p>{payable.description}</p>
            </div>
          )}
          {plannedMethod && (
            <div className="text-sm text-gray-700">
              <p className="text-xs font-semibold text-gray-500">Forma de pago prevista</p>
              <p>{plannedMethod.replace("pago previsto:", "").trim()}</p>
            </div>
          )}
          {plannedRef && (
            <div className="text-sm text-gray-700">
              <p className="text-xs font-semibold text-gray-500">Referencia prevista</p>
              <p>{plannedRef.replace("ref:", "").trim()}</p>
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500">Montos</p>
          <p className="text-sm text-gray-700">Total: {formatCurrency(payable.total_amount)}</p>
          <p className="text-sm text-gray-700">Pagado: {formatCurrency(payable.paid_amount || 0)}</p>
          <p className="text-sm text-gray-700">Saldo: {formatCurrency(payable.balance ?? payable.total_amount - (payable.paid_amount || 0))}</p>
          <div className="pt-2 space-y-2">
            <p className="text-xs font-semibold text-gray-500">Archivos</p>
            <div className="flex flex-wrap gap-2">
              {payable.invoice_file_url ? (
                <Link
                  href={payable.invoice_file_url}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-brand hover:text-brand"
                >
                  Factura PDF
                </Link>
              ) : (
                <span className="text-xs text-gray-500">Sin factura</span>
              )}
              {payable.op_pdf_url && (
                <Link
                  href={payable.op_pdf_url}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-brand hover:text-brand"
                >
                  Orden de pago
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-gray-800 mb-3">Historial de pagos (egresos)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase text-gray-600 tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">Folio EG</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Método</th>
                <th className="px-3 py-2 text-left">Ref</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(payable.allocations || []).map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-50/70">
                  <td className="px-3 py-2 text-xs text-gray-800">
                    EG-{String(a.egress?.folio_eg || 0).padStart(3, '0')}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">{a.egress?.payment_date || "--"}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{a.egress?.payment_method || "--"}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{a.egress?.reference_number || "--"}</td>
                  <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                    {formatCurrency(a.amount_allocated || 0)}
                  </td>
                  <td className="px-3 py-2 text-xs text-right">
                    {a.egress?.id ? (
                      <Link
                        href={`/api/egresses/${a.egress.id}/pdf?condominiumId=${condominiumId}`}
                        target="_blank"
                        className="text-brand hover:underline text-xs font-semibold"
                      >
                        Ver
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {(!payable.allocations || payable.allocations.length === 0) && (
                <tr>
                  <td className="px-3 py-4 text-center text-sm text-gray-500" colSpan={6}>
                    Aún no se registran pagos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


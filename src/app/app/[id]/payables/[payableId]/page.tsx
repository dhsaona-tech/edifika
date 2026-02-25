import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getPayableDetail } from "../actions";
import { documentTypeLabels } from "@/lib/payables/schemas";
import DeletePayableButton from "./DeletePayableButton";
import PrintDraftButton from "./PrintDraftButton";

type PageProps = { params: { id: string; payableId: string } | Promise<{ id: string; payableId: string }> };

export default async function PayableDetailPage({ params }: PageProps) {
  const resolved = await params;
  const condominiumId = resolved.id;
  const payableId = resolved.payableId;

  const payable = await getPayableDetail(condominiumId, payableId);
  if (!payable) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 bg-white">
        No se encontró la cuenta por pagar.
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pendiente: "bg-amber-100 text-amber-800",
    parcialmente_pagado: "bg-blue-100 text-blue-800",
    pagado: "bg-emerald-100 text-emerald-800",
    anulado: "bg-rose-100 text-rose-800",
  };

  const statusLabels: Record<string, string> = {
    pendiente: "Pendiente",
    parcialmente_pagado: "Parcialmente pagado",
    pagado: "Pagado",
    anulado: "Anulado",
  };

  const plannedMethod =
    (payable.notes || "")
      .split("|")
      .map((s: string) => s.trim().toLowerCase())
      .find((s: string) => s.startsWith("pago previsto")) || null;

  // Determinar acciones disponibles
  const canEdit = payable.status === "pendiente" && Number(payable.paid_amount || 0) === 0;
  const canDelete = payable.status === "pendiente" && Number(payable.paid_amount || 0) === 0;
  const canPay = ["pendiente", "parcialmente_pagado"].includes(payable.status);
  const documentTypeLabel = documentTypeLabels[payable.document_type] || "Documento";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase font-semibold text-gray-500">Cuenta por pagar</p>
          <h1 className="text-2xl font-semibold">
            {documentTypeLabel} {payable.invoice_number}
          </h1>
          <p className="text-sm text-gray-500">
            Proveedor: {payable.supplier?.name || "-"} · Rubro: {payable.expense_item?.name || "-"}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Botón imprimir borrador (siempre visible si está pendiente) */}
          {canEdit && (
            <PrintDraftButton
              condominiumId={condominiumId}
              payableId={payableId}
            />
          )}
          {canEdit && (
            <Link
              href={`/app/${condominiumId}/payables/${payable.id}/edit`}
              className="inline-flex items-center gap-2 rounded-md bg-white text-gray-800 px-4 py-2 text-xs font-semibold shadow-sm border border-gray-200 hover:border-brand hover:text-brand"
            >
              Editar
            </Link>
          )}
          {canDelete && (
            <DeletePayableButton
              condominiumId={condominiumId}
              payableId={payableId}
              invoiceNumber={payable.invoice_number}
            />
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
              {statusLabels[payable.status] || payable.status}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-700">
            <div>
              <p className="text-xs font-semibold text-gray-500">Tipo</p>
              <p>{documentTypeLabel}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Número</p>
              <p>{payable.invoice_number}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Emisión</p>
              <p>{payable.issue_date}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Vencimiento</p>
              <p>{payable.due_date}</p>
            </div>
          </div>
          {payable.description && (
            <div className="text-sm text-gray-700">
              <p className="text-xs font-semibold text-gray-500">Detalle</p>
              <p>{payable.description}</p>
            </div>
          )}
          {plannedMethod && (
            <div className="text-sm text-gray-700">
              <p className="text-xs font-semibold text-gray-500">Forma de pago prevista</p>
              <p className="capitalize">{plannedMethod.replace("pago previsto:", "").trim()}</p>
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500">Montos</p>
          <p className="text-sm text-gray-700">Total: {formatCurrency(payable.total_amount)}</p>
          <p className="text-sm text-gray-700">Pagado: {formatCurrency(payable.paid_amount || 0)}</p>
          <p className="text-sm text-gray-700 font-semibold">
            Saldo: {formatCurrency(payable.balance ?? payable.total_amount - (payable.paid_amount || 0))}
          </p>
          <div className="pt-2 space-y-2">
            <p className="text-xs font-semibold text-gray-500">Archivos</p>
            <div className="flex flex-wrap gap-2">
              {payable.invoice_file_url ? (
                <Link
                  href={payable.invoice_file_url}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-brand hover:text-brand"
                >
                  {documentTypeLabel} PDF
                </Link>
              ) : (
                <span className="text-xs text-gray-500">Sin documento adjunto</span>
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
                    EG-{String(a.egress?.folio_eg || 0).padStart(4, '0')}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">{a.egress?.payment_date || "--"}</td>
                  <td className="px-3 py-2 text-xs text-gray-700 capitalize">{a.egress?.payment_method || "--"}</td>
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

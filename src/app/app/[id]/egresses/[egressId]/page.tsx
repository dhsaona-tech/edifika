import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getEgressDetail } from "../actions";
import CancelEgressButton from "../components/CancelEgressButton";

type PageProps = { params: { id: string; egressId: string } | Promise<{ id: string; egressId: string }> };

export default async function EgressDetailPage({ params }: PageProps) {
  const resolved = await params;
  const condominiumId = resolved.id;
  const egressId = resolved.egressId;

  const egress = await getEgressDetail(condominiumId, egressId);
  if (!egress) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 bg-white">
        No se encontró el egreso.
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    disponible: "bg-emerald-100 text-emerald-800",
    anulado: "bg-rose-100 text-rose-800",
  };

  const allocatedSum = (egress.allocations || []).reduce((acc: number, a: any) => acc + Number(a.amount_allocated || 0), 0);
  const pdfHref = `/api/egresses/${egressId}/pdf?condominiumId=${condominiumId}`;
  const pdfButtonLabel = egress.pdf_url ? "Actualizar / ver PDF" : "Generar / ver PDF";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase font-semibold text-gray-500">Egreso</p>
          <h1 className="text-2xl font-semibold">Pago a proveedor</h1>
          <p className="text-sm text-gray-500">
            {egress.supplier?.name || "Proveedor"} · {egress.account?.bank_name || "Cuenta"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-right shadow-sm">
            <p className="text-[11px] uppercase font-semibold text-gray-500">Numero de egreso</p>
            <p className="text-xl font-bold text-gray-900">{egress.folio_eg ? egress.folio_eg.toString().padStart(4, "0") : "--"}</p>
          </div>
          <Link
            href={pdfHref}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-md bg-slate-200 text-gray-800 px-4 py-2 text-xs font-semibold shadow-sm hover:bg-slate-300"
          >
            {pdfButtonLabel}
          </Link>
          <CancelEgressButton
            condominiumId={condominiumId}
            egressId={egressId}
            status={egress.status}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">Proveedor</p>
              <p className="text-sm font-semibold text-gray-900">{egress.supplier?.name || "--"}</p>
              <p className="text-xs text-gray-500">
                Cuenta: {egress.account?.bank_name || "Cuenta"} {egress.account?.account_number || ""}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColors[egress.status] || "bg-gray-100 text-gray-700"}`}
            >
              {egress.status}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-700">
            <div>
              <p className="text-xs font-semibold text-gray-500">Fecha de pago</p>
              <p>{egress.payment_date}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Metodo</p>
              <p>{egress.payment_method}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Referencia</p>
              <p>{egress.reference_number || "--"}</p>
            </div>
            {egress.notes && (
              <div className="sm:col-span-3">
                <p className="text-xs font-semibold text-gray-500">Detalle del pago</p>
                <p className="text-sm text-gray-800">{egress.notes}</p>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500">Montos</p>
          <p className="text-sm text-gray-700">Total: {formatCurrency(egress.total_amount)}</p>
          <p className="text-sm text-gray-700">Asignado: {formatCurrency(allocatedSum)}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-gray-800 mb-3">OP pagadas</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase text-gray-600 tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">Factura</th>
                <th className="px-3 py-2 text-left">Rubro</th>
                <th className="px-3 py-2 text-left">Detalle</th>
                <th className="px-3 py-2 text-left">Emision</th>
                <th className="px-3 py-2 text-left">Vence</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2 text-right">Factura PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(egress.allocations || []).map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-50/70">
                  <td className="px-3 py-2 text-xs text-gray-800">{a.payable?.invoice_number || "--"}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{a.payable?.expense_item?.name || "--"}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{a.payable?.description || "—"}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{a.payable?.issue_date || "--"}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{a.payable?.due_date || "--"}</td>
                  <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">{formatCurrency(a.amount_allocated || 0)}</td>
                  <td className="px-3 py-2 text-xs text-right">
                    {a.payable?.invoice_file_url ? (
                      <Link
                        href={a.payable.invoice_file_url}
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
              {(!egress.allocations || egress.allocations.length === 0) && (
                <tr>
                  <td className="px-3 py-4 text-center text-sm text-gray-500" colSpan={6}>
                    No hay asignaciones.
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

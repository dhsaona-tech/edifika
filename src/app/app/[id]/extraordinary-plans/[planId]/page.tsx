import { getExtraordinaryPlanDetail } from "../actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Layers, ArrowLeft, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import QuotationsSection from "../components/QuotationsSection";
import PlanActions from "../components/PlanActions";

interface PageProps {
  params: Promise<{ id: string; planId: string }>;
}

const statusConfig = {
  borrador: { label: "Borrador", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  activo: { label: "Activo", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  completado: { label: "Completado", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default async function ExtraordinaryPlanDetailPage({ params }: PageProps) {
  const { id, planId } = await params;

  const detail = await getExtraordinaryPlanDetail(id, planId);

  if (!detail) {
    notFound();
  }

  const { plan, units, quotations } = detail;
  const status = statusConfig[plan.status as keyof typeof statusConfig];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/app/${id}/extraordinary-plans`}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-brand hover:border-brand/30 transition-all shadow-sm"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center border border-purple-200">
              <Layers size={20} className="text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                  {plan.name}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                  <StatusIcon size={12} />
                  {status.label}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {plan.description || "Proyecto de cuotas extraordinarias"}
              </p>
            </div>
          </div>
        </div>

        <PlanActions
          condominiumId={id}
          planId={planId}
          status={plan.status}
          hasQuotations={quotations.length > 0}
        />
      </div>

      {/* Info del proyecto */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Monto Total</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(plan.total_amount)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Cuotas</p>
          <p className="text-xl font-bold text-gray-900">{plan.total_installments}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Cuota Mensual</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(plan.total_amount / plan.total_installments)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Inicio</p>
          <p className="text-xl font-bold text-gray-900">
            {new Date(plan.start_period).toLocaleDateString("es-EC", {
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Seccion de Cotizaciones */}
      <QuotationsSection
        condominiumId={id}
        planId={planId}
        quotations={quotations}
        isEditable={plan.status === "borrador"}
      />

      {/* Distribucion por unidad (si hay) */}
      {units.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <FileText size={18} className="text-gray-500" />
            Distribucion por Unidad ({units.length} unidades)
          </h2>
          <div className="max-h-64 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Unidad</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Por Cuota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {unit.unit?.full_identifier || unit.unit?.identifier || "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {formatCurrency(unit.total_amount)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {formatCurrency(unit.installment_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  Calendar,
  DollarSign,
  Hash,
  CheckCircle,
  XCircle,
  Play,
  MoreVertical,
  Eye,
} from "lucide-react";
import { approveExtraordinaryPlan, cancelExtraordinaryPlan } from "../actions";
import type { ExtraordinaryPlan } from "@/types/billing";

interface Props {
  condominiumId: string;
  plans: ExtraordinaryPlan[];
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  borrador: { label: "Borrador", color: "text-yellow-700", bg: "bg-yellow-100" },
  activo: { label: "Activo", color: "text-green-700", bg: "bg-green-100" },
  completado: { label: "Completado", color: "text-blue-700", bg: "bg-blue-100" },
  cancelado: { label: "Cancelado", color: "text-red-700", bg: "bg-red-100" },
};

const distributionLabels: Record<string, string> = {
  por_aliquota: "Por Alicuota",
  igualitario: "Igualitario",
  manual: "Manual",
};

export default function ExtraordinaryPlansList({ condominiumId, plans }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (plans.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Layers size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">No hay planes extraordinarios</p>
        <p className="text-sm text-gray-400 mt-1">
          Crea un nuevo plan para distribuir cuotas extraordinarias
        </p>
      </div>
    );
  }

  const handleApprove = async (planId: string) => {
    if (!confirm("Aprobar este plan? Se generaran los cargos para todas las unidades.")) {
      return;
    }

    setOpenMenu(null);
    setError(null);

    startTransition(async () => {
      const result = await approveExtraordinaryPlan(condominiumId, planId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleCancel = async (planId: string) => {
    const reason = prompt("Razon de cancelacion:");
    if (!reason) return;

    setOpenMenu(null);
    setError(null);

    startTransition(async () => {
      const result = await cancelExtraordinaryPlan(condominiumId, planId, reason);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Plan
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Monto Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Cuotas
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Inicio
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Distribucion
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Estado
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plans.map((plan) => {
              const status = statusConfig[plan.status] || statusConfig.borrador;

              return (
                <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/app/${condominiumId}/extraordinary-plans/${plan.id}`} className="block group">
                      <p className="font-medium text-gray-900 group-hover:text-brand">{plan.name}</p>
                      <p className="text-xs text-gray-500">
                        {(plan.expense_item as any)?.name || "Sin rubro"}
                      </p>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-900">
                      <DollarSign size={14} className="text-gray-400" />
                      {plan.total_amount.toLocaleString("es-EC", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-700">
                      <Hash size={14} className="text-gray-400" />
                      {plan.total_installments}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-700">
                      <Calendar size={14} className="text-gray-400" />
                      {new Date(plan.start_period).toLocaleDateString("es-EC", {
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {distributionLabels[plan.distribution_method] || plan.distribution_method}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setOpenMenu(openMenu === plan.id ? null : plan.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                        disabled={isPending}
                      >
                        <MoreVertical size={16} className="text-gray-500" />
                      </button>

                      {openMenu === plan.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <Link
                            href={`/app/${condominiumId}/extraordinary-plans/${plan.id}`}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Eye size={14} />
                            Ver Detalle
                          </Link>
                          {plan.status === "borrador" && (
                            <>
                              <button
                                onClick={() => handleApprove(plan.id)}
                                className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                              >
                                <Play size={14} />
                                Aprobar
                              </button>
                              <button
                                onClick={() => handleCancel(plan.id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <XCircle size={14} />
                                Cancelar
                              </button>
                            </>
                          )}
                          {plan.status === "activo" && (
                            <button
                              onClick={() => handleCancel(plan.id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <XCircle size={14} />
                              Cancelar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

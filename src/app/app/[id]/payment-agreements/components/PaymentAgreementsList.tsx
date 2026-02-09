"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Handshake,
  Calendar,
  DollarSign,
  Hash,
  Home,
  XCircle,
  MoreVertical,
  Eye,
} from "lucide-react";
import { cancelPaymentAgreement } from "../actions";
import type { PaymentAgreement } from "@/types/billing";

interface Props {
  condominiumId: string;
  agreements: PaymentAgreement[];
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  activo: { label: "Activo", color: "text-green-700", bg: "bg-green-100" },
  completado: { label: "Completado", color: "text-blue-700", bg: "bg-blue-100" },
  incumplido: { label: "Incumplido", color: "text-orange-700", bg: "bg-orange-100" },
  cancelado: { label: "Cancelado", color: "text-red-700", bg: "bg-red-100" },
};

export default function PaymentAgreementsList({ condominiumId, agreements }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (agreements.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Handshake size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">No hay convenios de pago</p>
        <p className="text-sm text-gray-400 mt-1">
          Crea un nuevo convenio para refinanciar deuda de una unidad
        </p>
      </div>
    );
  }

  const handleCancel = async (agreementId: string) => {
    const reason = prompt("Razon de cancelacion:");
    if (!reason) return;

    setOpenMenu(null);
    setError(null);

    startTransition(async () => {
      const result = await cancelPaymentAgreement(condominiumId, agreementId, reason);
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
                Unidad
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Deuda Original
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Cuotas
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Monto Cuota
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Periodo
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
            {agreements.map((agreement) => {
              const status = statusConfig[agreement.status] || statusConfig.activo;
              const unit = agreement.unit as { identifier?: string; full_identifier?: string } | null;

              return (
                <tr key={agreement.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Home size={14} className="text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {unit?.full_identifier || unit?.identifier || "Sin unidad"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-900">
                      <DollarSign size={14} className="text-gray-400" />
                      {agreement.original_debt_amount.toLocaleString("es-EC", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-700">
                      <Hash size={14} className="text-gray-400" />
                      {agreement.installments}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-900">
                      ${agreement.installment_amount.toLocaleString("es-EC", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-700 text-sm">
                      <Calendar size={14} className="text-gray-400" />
                      {new Date(agreement.start_date).toLocaleDateString("es-EC", {
                        month: "short",
                        year: "2-digit",
                      })}
                      {" - "}
                      {new Date(agreement.end_date).toLocaleDateString("es-EC", {
                        month: "short",
                        year: "2-digit",
                      })}
                    </div>
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
                        onClick={() => setOpenMenu(openMenu === agreement.id ? null : agreement.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                        disabled={isPending}
                      >
                        <MoreVertical size={16} className="text-gray-500" />
                      </button>

                      {openMenu === agreement.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <Link
                            href={`/app/${condominiumId}/payment-agreements/${agreement.id}`}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Eye size={14} />
                            Ver Detalle
                          </Link>
                          {agreement.status === "activo" && (
                            <button
                              onClick={() => handleCancel(agreement.id)}
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

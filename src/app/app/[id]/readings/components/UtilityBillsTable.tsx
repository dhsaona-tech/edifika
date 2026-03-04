"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { UtilityBill } from "@/types/readings";
import { Eye, Gauge, BarChart3 } from "lucide-react";

const statusStyles: Record<string, { bg: string; label: string }> = {
  draft: { bg: "bg-amber-50 text-amber-700 border border-amber-200", label: "Borrador" },
  closed: { bg: "bg-blue-50 text-blue-700 border border-blue-200", label: "Cerrado" },
  billed: { bg: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "Facturado" },
};

const modeLabels: Record<string, string> = {
  meter_based: "Medidor",
  allocation: "Distribución",
};

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${meses[Number(month) - 1]} ${year}`;
}

export default function UtilityBillsTable({
  bills,
  condominiumId,
}: {
  bills: UtilityBill[];
  condominiumId: string;
}) {
  if (bills.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <Gauge size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">No hay lecturas registradas.</p>
        <p className="text-xs text-gray-400 mt-1">Crea una nueva lectura para comenzar.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Periodo</th>
            <th className="text-left px-4 py-3 font-semibold">Rubro</th>
            <th className="text-left px-4 py-3 font-semibold">Modo</th>
            <th className="text-right px-4 py-3 font-semibold">Total</th>
            <th className="text-center px-4 py-3 font-semibold">Estado</th>
            <th className="text-center px-4 py-3 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {bills.map((bill) => {
            const status = statusStyles[bill.status] || statusStyles.draft;
            return (
              <tr key={bill.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-4 py-3 font-medium">{formatPeriod(bill.period)}</td>
                <td className="px-4 py-3 text-gray-600">{bill.expense_item?.name || "—"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                    {bill.mode === "meter_based" ? (
                      <Gauge size={13} />
                    ) : (
                      <BarChart3 size={13} />
                    )}
                    {modeLabels[bill.mode]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {formatCurrency(bill.total_amount)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${status.bg}`}
                  >
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Link
                    href={`/app/${condominiumId}/readings/${bill.id}`}
                    className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-dark font-medium"
                  >
                    <Eye size={14} />
                    Ver
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

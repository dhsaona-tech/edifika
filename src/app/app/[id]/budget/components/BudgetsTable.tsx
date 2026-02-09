"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { BudgetMaster } from "@/types/budget";
import { formatCurrency } from "@/lib/utils";
import { setActiveBudget } from "../actions";
import { BadgeCheck, CalendarRange, Loader2, ShieldCheck, Pencil } from "lucide-react";

type Props = {
  condominiumId: string;
  budgets: BudgetMaster[];
  activeBudgetId: string | null;
};

const statusStyles: Record<string, string> = {
  borrador: "bg-amber-50 text-amber-700 border border-amber-200",
  aprobado: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  inactivo: "bg-gray-100 text-gray-500 border border-gray-200",
};

const typeLabel: Record<string, string> = {
  global: "Global",
  detallado: "Detallado",
};

const distributionLabel: Record<string, string> = {
  por_aliquota: "Por % de alícuota",
  igualitario: "Igualitario",
  manual_por_unidad: "Manual por unidad",
};

export default function BudgetsTable({ budgets, condominiumId, activeBudgetId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleSetActive = (budgetId: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await setActiveBudget(condominiumId, budgetId);
      if (result?.error) setMessage(result.error);
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left">Nombre</th>
            <th className="px-4 py-3 text-left">Año</th>
            <th className="px-4 py-3 text-left">Tipo</th>
            <th className="px-4 py-3 text-left">Distribución</th>
            <th className="px-4 py-3 text-right">Total anual</th>
            <th className="px-4 py-3 text-right">Mensual estimado</th>
            <th className="px-4 py-3 text-center">Estado</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {budgets.map((b) => {
            const isActive = activeBudgetId === b.id;
            const monthly = (b.total_annual_amount || 0) / 12;
            return (
              <tr key={b.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full text-[11px] font-semibold">
                        <ShieldCheck size={14} /> Activo
                      </span>
                    )}
                    <div className="font-semibold text-gray-800">{b.name}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{b.year}</td>
                <td className="px-4 py-3 text-gray-700">{typeLabel[b.budget_type]}</td>
                <td className="px-4 py-3 text-gray-700">{distributionLabel[b.distribution_method || "por_aliquota"]}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {formatCurrency(b.total_annual_amount)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(monthly)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${statusStyles[b.status] || statusStyles.borrador}`}>
                    {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!isActive && (
                      <button
                        onClick={() => handleSetActive(b.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 border border-emerald-200 px-3 py-1 rounded-md hover:bg-emerald-50 disabled:opacity-60"
                      >
                        {isPending ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                        Activar
                      </button>
                    )}
                    <Link
                      href={`/app/${condominiumId}/budget/${b.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark px-3 py-1 rounded-md border border-brand/40 hover:bg-brand/5 transition"
                    >
                      <CalendarRange size={14} />
                      Ver
                    </Link>
                    <Link
                      href={`/app/${condominiumId}/budget/${b.id}/edit`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-brand px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition"
                    >
                      <Pencil size={14} />
                      Editar
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
          {budgets.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={8}>
                No hay presupuestos registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {message && (
        <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-t border-red-100">{message}</div>
      )}
    </div>
  );
}

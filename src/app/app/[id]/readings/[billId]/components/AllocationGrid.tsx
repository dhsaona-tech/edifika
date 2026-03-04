"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import type { UtilityBill } from "@/types/readings";

interface UnitForAllocation {
  id: string;
  identifier: string;
  full_identifier: string | null;
  aliquot: number;
}

function redondear(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default function AllocationGrid({
  bill,
  units,
}: {
  bill: UtilityBill;
  units: UnitForAllocation[];
}) {
  const isAliquot = bill.allocation_method === "por_aliquota";

  const distribution = useMemo(() => {
    if (isAliquot) {
      const sumAliquot = units.reduce((acc, u) => acc + (u.aliquot || 0), 0) || 1;
      return units.map((u) => ({
        ...u,
        amount: redondear(bill.total_amount * ((u.aliquot || 0) / sumAliquot)),
      }));
    } else {
      const perUnit = units.length > 0 ? bill.total_amount / units.length : 0;
      return units.map((u) => ({
        ...u,
        amount: redondear(perUnit),
      }));
    }
  }, [units, bill.total_amount, isAliquot]);

  const totalDistributed = useMemo(
    () => distribution.reduce((acc, d) => acc + d.amount, 0),
    [distribution]
  );

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Unidad</th>
              {isAliquot && (
                <th className="text-right px-4 py-3 font-semibold">Alícuota (%)</th>
              )}
              <th className="text-right px-4 py-3 font-semibold">Monto ($)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {distribution.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  {d.full_identifier || d.identifier}
                </td>
                {isAliquot && (
                  <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">
                    {d.aliquot.toFixed(2)}%
                  </td>
                )}
                <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                  {formatCurrency(d.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr className="font-bold text-sm">
              <td className="px-4 py-3 text-gray-700">TOTAL</td>
              {isAliquot && <td></td>}
              <td className="px-4 py-3 text-right tabular-nums">
                {formatCurrency(totalDistributed)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Rounding difference notice */}
      {Math.abs(totalDistributed - bill.total_amount) > 0.01 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Diferencia por redondeo: {formatCurrency(bill.total_amount - totalDistributed)}
        </p>
      )}

      <p className="text-xs text-gray-400">
        Los montos se calculan automáticamente según el método de distribución seleccionado.
        No hay campos editables en este modo.
      </p>
    </div>
  );
}

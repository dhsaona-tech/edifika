"use client";

import { Check, CheckStatus } from "@/types/financial";
import { useTransition } from "react";
import { updateCheckStatus } from "../../actions";

type Props = {
  condominiumId: string;
  checks: (Check & { checkbook?: { start_number: number; end_number: number } })[];
};

const statuses: CheckStatus[] = ["disponible", "usado", "anulado", "perdido"];

export default function ChecksTab({ condominiumId, checks }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (checkId: string, status: CheckStatus) => {
    startTransition(async () => {
      await updateCheckStatus(condominiumId, checkId, status);
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[11px] uppercase font-semibold text-gray-500">Cheques</p>
        <h3 className="text-lg font-semibold text-gray-900">Listado y estado</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Numero</th>
              <th className="px-4 py-3 text-left">Chequera</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Fecha emision</th>
              <th className="px-4 py-3 text-left">Egreso</th>
              <th className="px-4 py-3 text-left">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {checks.map((chk) => (
              <tr key={chk.id} className="hover:bg-gray-50/80">
                <td className="px-4 py-3 font-semibold text-gray-800">{chk.check_number}</td>
                <td className="px-4 py-3 text-gray-700">
                  {chk.checkbook ? `${chk.checkbook.start_number} - ${chk.checkbook.end_number}` : "-"}
                </td>
                <td className="px-4 py-3">
                  <select
                    disabled={isPending}
                    defaultValue={chk.status}
                    onChange={(e) => handleChange(chk.id, e.target.value as CheckStatus)}
                    className="text-xs rounded-md border border-gray-200 bg-white px-2 py-1 shadow-sm focus:border-brand focus:ring-brand/20"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-700">{chk.issue_date || "-"}</td>
                <td className="px-4 py-3 text-gray-700">{chk.egress_id || "-"}</td>
                <td className="px-4 py-3 text-gray-600">{chk.notes || "-"}</td>
              </tr>
            ))}
            {checks.length === 0 && (
              <tr>
                <td className="px-4 py-5 text-center text-gray-500" colSpan={6}>
                  No hay cheques generados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

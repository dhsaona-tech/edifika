"use client";

import { Checkbook } from "@/types/financial";
import CheckbookModal from "./CheckbookModal";

type Props = { condominiumId: string; accountId: string; checkbooks: Checkbook[] };

export default function CheckbooksTab({ condominiumId, accountId, checkbooks }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div>
          <p className="text-[11px] uppercase font-semibold text-gray-500">Chequeras</p>
          <h3 className="text-lg font-semibold text-gray-900">Control de rangos</h3>
        </div>
        <CheckbookModal condominiumId={condominiumId} accountId={accountId} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Rango</th>
              <th className="px-4 py-3 text-left">Siguiente</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {checkbooks.map((cb) => (
              <tr key={cb.id} className="hover:bg-gray-50/80">
                <td className="px-4 py-3 font-semibold text-gray-800">
                  {cb.start_number} - {cb.end_number}
                </td>
                <td className="px-4 py-3 text-gray-700">{cb.current_number ?? cb.start_number}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                      cb.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {cb.is_active ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{cb.notes || "-"}</td>
              </tr>
            ))}
            {checkbooks.length === 0 && (
              <tr>
                <td className="px-4 py-5 text-center text-gray-500" colSpan={4}>
                  No hay chequeras registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

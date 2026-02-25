"use client";

import { Checkbook } from "@/types/financial";
import CheckbookModal from "./CheckbookModal";
import { BookOpen, CheckCircle, XCircle } from "lucide-react";

type Props = {
  condominiumId: string;
  accountId: string;
  checkbooks: Checkbook[];
};

export default function CheckbooksTab({ condominiumId, accountId, checkbooks }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 rounded-lg">
            <BookOpen className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-[11px] uppercase font-semibold text-gray-500">Chequeras</p>
            <h3 className="text-lg font-semibold text-gray-900">Control de Rangos</h3>
          </div>
        </div>
        <CheckbookModal condominiumId={condominiumId} accountId={accountId} />
      </div>

      {checkbooks.length === 0 ? (
        <div className="p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">No hay chequeras registradas</p>
          <p className="text-xs text-gray-400">
            Registra una chequera para habilitar el control de cheques
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {checkbooks.map((cb) => {
            const totalChecks = cb.end_number - cb.start_number + 1;
            const usedChecks = (cb.current_number ?? cb.start_number) - cb.start_number;
            const usagePercent = (usedChecks / totalChecks) * 100;
            const remainingChecks = totalChecks - usedChecks;

            return (
              <div key={cb.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 text-lg">
                        {cb.start_number.toString().padStart(6, "0")} -{" "}
                        {cb.end_number.toString().padStart(6, "0")}
                      </span>
                      {cb.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle size={10} />
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                          <XCircle size={10} />
                          Inactiva
                        </span>
                      )}
                    </div>
                    {cb.notes && <p className="text-xs text-gray-500 mt-1">{cb.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Siguiente cheque</p>
                    <p className="font-mono font-bold text-brand text-lg">
                      {(cb.current_number ?? cb.start_number).toString().padStart(6, "0")}
                    </p>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Uso de la chequera</span>
                    <span>
                      {usedChecks} de {totalChecks} ({usagePercent.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        usagePercent >= 90
                          ? "bg-red-500"
                          : usagePercent >= 70
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="font-bold text-gray-900">{totalChecks}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-blue-600">Emitidos</p>
                    <p className="font-bold text-blue-700">{usedChecks}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-emerald-600">Disponibles</p>
                    <p className="font-bold text-emerald-700">{remainingChecks}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

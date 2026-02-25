"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Settings, RefreshCw } from "lucide-react";

type Movement = {
  id: string;
  movement_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  reference_number: string | null;
  movement_date: string;
  created_at: string;
  payment_id: string | null;
  egress_id: string | null;
  transfer_id: string | null;
};

type Props = {
  movements: Movement[];
  condominiumId: string;
  accountId: string;
};

const movementTypeLabels: Record<string, { label: string; color: string; icon: typeof ArrowDownLeft }> = {
  ingreso: { label: "Ingreso", color: "text-emerald-600 bg-emerald-50", icon: ArrowDownLeft },
  egreso: { label: "Egreso", color: "text-red-600 bg-red-50", icon: ArrowUpRight },
  transferencia_in: { label: "Transferencia entrada", color: "text-blue-600 bg-blue-50", icon: ArrowLeftRight },
  transferencia_out: { label: "Transferencia salida", color: "text-orange-600 bg-orange-50", icon: ArrowLeftRight },
  ajuste_manual: { label: "Ajuste manual", color: "text-purple-600 bg-purple-50", icon: Settings },
  apertura: { label: "Saldo inicial", color: "text-gray-600 bg-gray-50", icon: RefreshCw },
  anulacion_ingreso: { label: "Anulación ingreso", color: "text-rose-600 bg-rose-50", icon: RefreshCw },
  anulacion_egreso: { label: "Anulación egreso", color: "text-amber-600 bg-amber-50", icon: RefreshCw },
  nota_debito: { label: "Nota de débito", color: "text-red-700 bg-red-50", icon: ArrowUpRight },
};

export default function MovementsTab({ movements, condominiumId, accountId }: Props) {
  const [filter, setFilter] = useState<string>("all");

  const filteredMovements = filter === "all"
    ? movements
    : movements.filter((m) => m.movement_type === filter);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Movimientos</h3>
          <p className="text-sm text-gray-500">Historial de transacciones de esta cuenta</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="ingreso">Ingresos</option>
            <option value="egreso">Egresos</option>
            <option value="transferencia_in">Transferencias entrada</option>
            <option value="transferencia_out">Transferencias salida</option>
            <option value="ajuste_manual">Ajustes manuales</option>
          </select>
        </div>
      </div>

      {filteredMovements.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No hay movimientos registrados
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMovements.map((movement) => {
                const typeInfo = movementTypeLabels[movement.movement_type] || {
                  label: movement.movement_type,
                  color: "text-gray-600 bg-gray-50",
                  icon: Settings,
                };
                const Icon = typeInfo.icon;
                const isPositive = movement.amount > 0;

                return (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-gray-600">
                      {formatDate(movement.movement_date)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                        <Icon size={12} />
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-gray-900">{movement.description || "—"}</div>
                      {movement.reference_number && (
                        <div className="text-xs text-gray-500">Ref: {movement.reference_number}</div>
                      )}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                      {isPositive ? "+" : ""}{formatCurrency(movement.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-gray-900">
                      {formatCurrency(movement.balance_after)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredMovements.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 text-right">
          Mostrando {filteredMovements.length} movimiento(s)
        </div>
      )}
    </div>
  );
}

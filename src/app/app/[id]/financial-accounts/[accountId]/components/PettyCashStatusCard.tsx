"use client";

import { formatCurrency } from "@/lib/utils";
import { Wallet, AlertTriangle, CheckCircle } from "lucide-react";

type Props = {
  maxAmount: number;
  cashOnHand: number;
  pendingVouchersAmount: number;
  pendingVouchersCount: number;
  custodianName?: string;
};

export default function PettyCashStatusCard({
  maxAmount,
  cashOnHand,
  pendingVouchersAmount,
  pendingVouchersCount,
  custodianName,
}: Props) {
  const availableCash = cashOnHand - pendingVouchersAmount;
  const usagePercent = maxAmount > 0 ? ((maxAmount - availableCash) / maxAmount) * 100 : 0;
  const needsReplenishment = usagePercent >= 70;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Wallet className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Estado de Caja Chica</h3>
            {custodianName && (
              <p className="text-xs text-gray-500">Custodio: {custodianName}</p>
            )}
          </div>
        </div>
        {needsReplenishment ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <AlertTriangle size={12} />
            Requiere reposición
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
            <CheckCircle size={12} />
            OK
          </span>
        )}
      </div>

      {/* Barra de uso */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Uso del fondo</span>
          <span>{usagePercent.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/60 rounded-lg p-3">
          <p className="text-[10px] uppercase font-semibold text-gray-500">Fondo máximo</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(maxAmount)}</p>
        </div>
        <div className="bg-white/60 rounded-lg p-3">
          <p className="text-[10px] uppercase font-semibold text-gray-500">Disponible</p>
          <p className={`text-lg font-bold ${availableCash < 0 ? "text-red-600" : "text-emerald-600"}`}>
            {formatCurrency(availableCash)}
          </p>
        </div>
        <div className="bg-white/60 rounded-lg p-3">
          <p className="text-[10px] uppercase font-semibold text-gray-500">Comprobantes pendientes</p>
          <p className="text-lg font-bold text-amber-600">{pendingVouchersCount}</p>
        </div>
        <div className="bg-white/60 rounded-lg p-3">
          <p className="text-[10px] uppercase font-semibold text-gray-500">Por reponer</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(pendingVouchersAmount)}</p>
        </div>
      </div>
    </div>
  );
}

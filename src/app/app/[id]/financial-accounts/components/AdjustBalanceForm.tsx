"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustAccountBalance } from "../actions";
import { Settings, X } from "lucide-react";

type Props = {
  condominiumId: string;
  accountId: string;
  accountName: string;
  currentBalance: number;
};

export default function AdjustBalanceForm({ condominiumId, accountId, accountName, currentBalance }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [adjustmentType, setAdjustmentType] = useState<"increase" | "decrease">("increase");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const resetForm = () => {
    setAdjustmentType("increase");
    setAmount("");
    setReason("");
    setError(null);
  };

  const handleSubmit = () => {
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Ingresa un monto válido mayor a 0");
      return;
    }

    if (!reason.trim()) {
      setError("Debes ingresar el motivo del ajuste");
      return;
    }

    const adjustmentAmount = adjustmentType === "increase" ? amountNum : -amountNum;

    // Verificar que no quede negativo
    if (currentBalance + adjustmentAmount < 0) {
      setError("El ajuste dejaría el saldo en negativo");
      return;
    }

    startTransition(async () => {
      const result = await adjustAccountBalance(
        condominiumId,
        accountId,
        adjustmentAmount,
        reason.trim()
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      resetForm();
      setIsOpen(false);
      router.refresh();
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-gray-50"
      >
        <Settings size={14} />
        Ajustar saldo
      </button>
    );
  }

  const newBalance = currentBalance + (adjustmentType === "increase" ? parseFloat(amount || "0") : -parseFloat(amount || "0"));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Ajustar saldo</h3>
          <button
            onClick={() => {
              resetForm();
              setIsOpen(false);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Cuenta</p>
            <p className="font-semibold text-gray-900">{accountName}</p>
            <p className="text-sm text-gray-600">Saldo actual: ${currentBalance.toFixed(2)}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-2">Tipo de ajuste</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType("increase")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors ${
                  adjustmentType === "increase"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                + Aumentar
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("decrease")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors ${
                  adjustmentType === "decrease"
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                - Disminuir
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Monto *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            {amount && !isNaN(parseFloat(amount)) && (
              <p className={`text-xs mt-1 ${newBalance < 0 ? "text-red-600" : "text-gray-500"}`}>
                Nuevo saldo: ${newBalance.toFixed(2)}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Motivo del ajuste *</label>
            <textarea
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Corrección por diferencia en conciliación bancaria"
            />
            <p className="text-xs text-gray-500 mt-1">
              Este motivo quedará registrado en el historial de movimientos.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={() => {
              resetForm();
              setIsOpen(false);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !amount || !reason.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
          >
            {isPending ? "Ajustando..." : "Aplicar ajuste"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fundPettyCash } from "../../petty-cash-actions";
import { formatCurrency } from "@/lib/utils";
import { PlusCircle, X, ArrowRight, Banknote } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

type BankAccount = {
  id: string;
  bank_name: string;
  account_number: string;
  current_balance: number;
};

type Props = {
  condominiumId: string;
  pettyCashAccountId: string;
  pettyCashName: string;
  bankAccounts: BankAccount[];
};

export default function FundPettyCashButton({
  condominiumId,
  pettyCashAccountId,
  pettyCashName,
  bankAccounts,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [sourceAccountId, setSourceAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [fundDate, setFundDate] = useState(new Date().toISOString().slice(0, 10));

  const selectedSource = bankAccounts.find((a) => a.id === sourceAccountId);

  const handleSubmit = () => {
    setError(null);

    if (!sourceAccountId) {
      setError("Selecciona la cuenta de origen");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Ingresa un monto válido mayor a 0");
      return;
    }

    if (selectedSource && amountNum > selectedSource.current_balance) {
      setError(`Saldo insuficiente. Disponible: ${formatCurrency(selectedSource.current_balance)}`);
      return;
    }

    startTransition(async () => {
      const result = await fundPettyCash(
        condominiumId,
        pettyCashAccountId,
        sourceAccountId,
        amountNum,
        description.trim() || "Fondeo de caja chica",
        fundDate
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      setIsOpen(false);
      resetForm();
      router.refresh();
    });
  };

  const resetForm = () => {
    setSourceAccountId("");
    setAmount("");
    setDescription("");
    setFundDate(new Date().toISOString().slice(0, 10));
    setError(null);
  };

  if (bankAccounts.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-emerald-700 transition-colors"
      >
        <PlusCircle size={16} />
        Agregar Fondos
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-900">Fondear Caja Chica</h3>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Cuenta origen */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Desde cuenta *
                </label>
                <select
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                >
                  <option value="">Selecciona una cuenta</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bank_name} - {acc.account_number} ({formatCurrency(acc.current_balance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Visualización de la transferencia */}
              {selectedSource && (
                <div className="flex items-center justify-center gap-3 py-2 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Desde</p>
                    <p className="font-medium text-sm text-gray-800">{selectedSource.bank_name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(selectedSource.current_balance)}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-emerald-600" />
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Hacia</p>
                    <p className="font-medium text-sm text-gray-800">{pettyCashName}</p>
                  </div>
                </div>
              )}

              {/* Monto */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Monto *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Fecha
                </label>
                <DatePicker value={fundDate} onChange={setFundDate} />
              </div>

              {/* Descripción */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fondeo de caja chica"
                />
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
                  setIsOpen(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || !sourceAccountId || !amount}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPending ? "Transfiriendo..." : "Transferir Fondos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSimpleExpense } from "../../petty-cash-actions";
import { formatCurrency } from "@/lib/utils";
import { Receipt, X } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

type ExpenseItem = {
  id: string;
  name: string;
};

type Props = {
  condominiumId: string;
  accountId: string;
  availableBalance: number;
  expenseItems: ExpenseItem[];
};

export default function AddExpenseButton({
  condominiumId,
  accountId,
  availableBalance,
  expenseItems,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [expenseItemId, setExpenseItemId] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));

  const handleSubmit = () => {
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Ingresa un monto válido mayor a 0");
      return;
    }

    if (amountNum > availableBalance) {
      setError(`Saldo insuficiente. Disponible: ${formatCurrency(availableBalance)}`);
      return;
    }

    if (!description.trim()) {
      setError("La descripción es requerida");
      return;
    }

    startTransition(async () => {
      const result = await createSimpleExpense(condominiumId, accountId, {
        amount: amountNum,
        description: description.trim(),
        beneficiary: beneficiary.trim() || undefined,
        expense_item_id: expenseItemId || undefined,
        expense_date: expenseDate,
      });

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
    setAmount("");
    setDescription("");
    setBeneficiary("");
    setExpenseItemId("");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setError(null);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={availableBalance <= 0}
        className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={availableBalance <= 0 ? "Sin saldo disponible" : "Registrar gasto"}
      >
        <Receipt size={16} />
        Registrar Gasto
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-gray-900">Registrar Gasto</h3>
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
              {/* Saldo disponible */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                <p className="text-xs text-emerald-600 uppercase font-semibold">Saldo disponible</p>
                <p className="text-xl font-bold text-emerald-800">{formatCurrency(availableBalance)}</p>
              </div>

              {/* Monto */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Monto *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={availableBalance}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Descripción *
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Compra de útiles de oficina"
                />
              </div>

              {/* Beneficiario */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Beneficiario (opcional)
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  placeholder="Nombre de quien recibió el pago"
                />
              </div>

              {/* Rubro */}
              {expenseItems.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    Rubro (opcional)
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                    value={expenseItemId}
                    onChange={(e) => setExpenseItemId(e.target.value)}
                  >
                    <option value="">Sin rubro específico</option>
                    {expenseItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Fecha */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Fecha del gasto
                </label>
                <DatePicker value={expenseDate} onChange={setExpenseDate} />
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
                disabled={isPending || !amount || !description.trim()}
                className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
              >
                {isPending ? "Guardando..." : "Guardar Gasto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

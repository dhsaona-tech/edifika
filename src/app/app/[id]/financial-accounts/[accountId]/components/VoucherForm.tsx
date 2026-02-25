"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPettyCashVoucher } from "../../petty-cash-actions";
import { Plus, X, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type ExpenseItem = {
  id: string;
  name: string;
};

type Props = {
  condominiumId: string;
  accountId: string;
  expenseItems: ExpenseItem[];
  availableCash: number;
};

export default function VoucherForm({ condominiumId, accountId, expenseItems, availableCash }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseItemId, setExpenseItemId] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setExpenseItemId("");
    setBeneficiary("");
    setVoucherDate(new Date().toISOString().slice(0, 10));
    setError(null);
  };

  const handleSubmit = () => {
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Ingresa un monto válido mayor a 0");
      return;
    }

    if (amountNum > availableCash) {
      setError(`Monto excede el efectivo disponible (${formatCurrency(availableCash)})`);
      return;
    }

    if (!description.trim()) {
      setError("La descripción es requerida");
      return;
    }

    startTransition(async () => {
      const result = await createPettyCashVoucher(condominiumId, accountId, {
        amount: amountNum,
        description: description.trim(),
        expense_item_id: expenseItemId || undefined,
        beneficiary: beneficiary.trim() || undefined,
        voucher_date: voucherDate,
      });

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
        className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-amber-700"
      >
        <Plus size={16} />
        Nuevo Comprobante
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-900">Registrar Comprobante</h3>
          </div>
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <span className="text-amber-800">Efectivo disponible: </span>
            <span className="font-semibold text-amber-900">{formatCurrency(availableCash)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Fecha</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Descripción *</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Compra de artículos de limpieza"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Rubro de gasto</label>
            <select
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={expenseItemId}
              onChange={(e) => setExpenseItemId(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {expenseItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Categoriza el gasto para reportes
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Beneficiario</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              placeholder="Ej: Ferretería El Constructor"
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
              resetForm();
              setIsOpen(false);
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
            {isPending ? "Guardando..." : "Registrar Comprobante"}
          </button>
        </div>
      </div>
    </div>
  );
}

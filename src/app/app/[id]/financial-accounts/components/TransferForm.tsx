"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transferBetweenAccounts } from "../actions";
import { ArrowRightLeft, X } from "lucide-react";

type Account = {
  id: string;
  bank_name: string;
  account_number: string;
  current_balance: number;
  account_type: string;
};

type Props = {
  condominiumId: string;
  accounts: Account[];
};

export default function TransferForm({ condominiumId, accounts }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));

  const fromAccount = accounts.find((a) => a.id === fromAccountId);

  // Filtrar destinos: NO permitir transferir DE banco A caja chica
  // La caja chica se fondea mediante egresos, no transferencias directas
  // Solo permitir: banco→banco, caja_chica→banco (devolución)
  const availableDestinations = accounts.filter((a) => {
    if (a.id === fromAccountId) return false;
    // Si origen es banco (corriente/ahorros), destino NO puede ser caja_chica
    if (fromAccount && fromAccount.account_type !== "caja_chica" && a.account_type === "caja_chica") {
      return false;
    }
    return true;
  });

  const resetForm = () => {
    setFromAccountId("");
    setToAccountId("");
    setAmount("");
    setDescription("");
    setReferenceNumber("");
    setTransferDate(new Date().toISOString().slice(0, 10));
    setError(null);
  };

  const handleSubmit = () => {
    setError(null);

    if (!fromAccountId || !toAccountId) {
      setError("Selecciona cuenta origen y destino");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Ingresa un monto válido mayor a 0");
      return;
    }

    if (fromAccount && amountNum > fromAccount.current_balance) {
      setError(`Saldo insuficiente. Disponible: $${fromAccount.current_balance.toFixed(2)}`);
      return;
    }

    startTransition(async () => {
      const result = await transferBetweenAccounts(
        condominiumId,
        fromAccountId,
        toAccountId,
        amountNum,
        description || undefined,
        referenceNumber || undefined,
        transferDate
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
        className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-purple-700"
      >
        <ArrowRightLeft size={16} />
        Transferir
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Transferir entre cuentas</h3>
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
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Cuenta origen *</label>
            <select
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={fromAccountId}
              onChange={(e) => {
                setFromAccountId(e.target.value);
                if (e.target.value === toAccountId) setToAccountId("");
              }}
            >
              <option value="">Selecciona</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bank_name} - {acc.account_number} (${acc.current_balance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Cuenta destino *</label>
            <select
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              disabled={!fromAccountId}
            >
              <option value="">Selecciona</option>
              {availableDestinations.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bank_name} - {acc.account_number}
                </option>
              ))}
            </select>
            {fromAccount && fromAccount.account_type !== "caja_chica" && (
              <p className="text-[10px] text-amber-600 mt-1">
                No se puede transferir a caja chica. Usa un egreso para fondear la caja chica.
              </p>
            )}
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
            {fromAccount && (
              <p className="text-xs text-gray-500 mt-1">
                Disponible: ${fromAccount.current_balance.toFixed(2)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Fecha</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Referencia</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Descripción</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Reposición caja chica"
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
            disabled={isPending || !fromAccountId || !toAccountId || !amount}
            className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
          >
            {isPending ? "Transfiriendo..." : "Transferir"}
          </button>
        </div>
      </div>
    </div>
  );
}

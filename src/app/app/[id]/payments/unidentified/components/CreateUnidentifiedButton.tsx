"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import { createUnidentifiedPayment } from "../../actions";
import { paymentMethodOptions } from "@/lib/payments/schemas";

type AccountOption = { value: string; label: string };

type Props = {
  condominiumId: string;
  accounts: AccountOption[];
};

export default function CreateUnidentifiedButton({ condominiumId, accounts }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("deposito");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setPaymentDate("");
    setAmount("");
    setPaymentMethod("deposito");
    setReferenceNumber("");
    setBankReference("");
    setAccountId("");
    setNotes("");
    setError(null);
  };

  const handleSubmit = () => {
    if (!paymentDate) {
      setError("Selecciona la fecha del depósito.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    if (!accountId) {
      setError("Selecciona la cuenta donde apareció el depósito.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createUnidentifiedPayment(condominiumId, {
        payment_date: paymentDate,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        reference_number: referenceNumber || undefined,
        bank_reference: bankReference || undefined,
        financial_account_id: accountId,
        notes: notes || undefined,
      });

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      resetForm();
      setIsOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-brand-dark"
      >
        <Plus size={18} />
        Registrar ingreso no identificado
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Nuevo ingreso no identificado</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                Registra un depósito o transferencia que apareció en el banco pero no sabes a qué
                unidad pertenece. Podrás asignarlo después.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Fecha del depósito *
                  </label>
                  <DatePicker value={paymentDate} onChange={setPaymentDate} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Monto *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Cuenta donde apareció *
                </label>
                <select
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  <option value="">Selecciona la cuenta</option>
                  {accounts.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Método</label>
                <select
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {paymentMethodOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Número de referencia
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Del comprobante"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Referencia bancaria
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                    value={bankReference}
                    onChange={(e) => setBankReference(e.target.value)}
                    placeholder="Del estado de cuenta"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Notas</label>
                <textarea
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones para identificar el depósito..."
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t bg-gray-50">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-md hover:bg-brand-dark disabled:opacity-60"
              >
                {isPending ? "Guardando..." : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

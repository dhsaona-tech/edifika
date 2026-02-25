"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPettyCashAccount, getCustodianOptions } from "../actions";
import { Wallet, X, Plus, User, DollarSign } from "lucide-react";

type Props = {
  condominiumId: string;
};

type Custodian = {
  id: string;
  full_name: string;
};

export default function PettyCashForm({ condominiumId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [custodians, setCustodians] = useState<Custodian[]>([]);

  // Campos del formulario
  const [name, setName] = useState("Caja Chica Principal");
  const [initialAmount, setInitialAmount] = useState("200");
  const [custodianId, setCustodianId] = useState("");

  useEffect(() => {
    if (open) {
      getCustodianOptions(condominiumId).then(setCustodians);
    }
  }, [open, condominiumId]);

  const resetForm = () => {
    setName("Caja Chica Principal");
    setInitialAmount("200");
    setCustodianId("");
    setError(null);
  };

  const handleSubmit = () => {
    setError(null);

    const amount = parseFloat(initialAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Ingresa un monto inicial válido");
      return;
    }

    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    startTransition(async () => {
      const result = await createPettyCashAccount(condominiumId, {
        name: name.trim(),
        initial_amount: amount,
        custodian_id: custodianId || null,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      resetForm();
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-amber-600 text-white px-3 py-2 rounded-md text-xs font-semibold hover:bg-amber-700 shadow-sm transition-colors"
      >
        <Wallet size={14} />
        Nueva Caja Chica
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Wallet className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Nueva Caja Chica</h3>
                    <p className="text-xs text-gray-500">Fondo para gastos menores</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    resetForm();
                    setOpen(false);
                  }}
                  className="text-gray-400 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Nombre */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 uppercase mb-1.5 block">
                  Nombre de la caja *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-amber-400 focus:ring-amber-400/20 focus:ring-2 transition-all"
                  placeholder="Ej: Caja Chica Principal"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Un nombre descriptivo para identificar esta caja
                </p>
              </div>

              {/* Monto inicial */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 uppercase mb-1.5 flex items-center gap-1.5">
                  <DollarSign size={12} className="text-amber-500" />
                  Monto inicial *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-200 pl-7 pr-3 text-sm shadow-sm focus:border-amber-400 focus:ring-amber-400/20 focus:ring-2 transition-all"
                    placeholder="200.00"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  El monto con el que abrirás la caja (ej: $200, $150)
                </p>
              </div>

              {/* Custodio */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 uppercase mb-1.5 flex items-center gap-1.5">
                  <User size={12} className="text-amber-500" />
                  Custodio (opcional)
                </label>
                <select
                  value={custodianId}
                  onChange={(e) => setCustodianId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-amber-400 focus:ring-amber-400/20 focus:ring-2 transition-all"
                >
                  <option value="">Sin asignar</option>
                  {custodians.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Persona responsable de administrar el efectivo (solo administradores)
                </p>
              </div>

              {/* Info box */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-amber-800">
                  <strong>Flujo:</strong> Crea la caja → Haz un egreso desde banco al custodio → Abre el primer período con el monto entregado.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isPending ? (
                  "Creando..."
                ) : (
                  <>
                    <Plus size={14} />
                    Crear Caja Chica
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

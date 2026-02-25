"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { assignUnidentifiedPayment } from "../../actions";

type UnidentifiedPayment = {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  bank_reference: string | null;
  notes: string | null;
};

type UnitOption = { value: string; label: string };

type ChargeRow = {
  id: string;
  period: string | null;
  description?: string | null;
  due_date?: string | null;
  balance: number;
  expense_item?: { name?: string | null } | null;
  include: boolean;
  amountToApply: number;
};

type Props = {
  payment: UnidentifiedPayment;
  condominiumId: string;
  units: UnitOption[];
  onClose: () => void;
};

export default function AssignUnidentifiedModal({
  payment,
  condominiumId,
  units,
  onClose,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [loadingCharges, setLoadingCharges] = useState(false);

  useEffect(() => {
    if (selectedUnit) {
      loadCharges(selectedUnit);
    } else {
      setCharges([]);
    }
  }, [selectedUnit]);

  const loadCharges = async (unitId: string) => {
    setLoadingCharges(true);
    const { data, error } = await supabase
      .from("charges")
      .select(`
        id,
        period,
        description,
        due_date,
        balance,
        expense_item:expense_items(name)
      `)
      .eq("condominium_id", condominiumId)
      .eq("unit_id", unitId)
      .eq("status", "pendiente")
      .order("due_date", { ascending: true });

    if (error) {
      setError("No se pudieron cargar los cargos pendientes.");
      setLoadingCharges(false);
      return;
    }

    // Pre-seleccionar cargos hasta cubrir el monto del pago no identificado
    let remaining = payment.amount;
    const mapped = (data || []).map((c: any) => {
      const balance = Number(c.balance || 0);
      let amountToApply = 0;
      let include = false;

      if (remaining > 0) {
        amountToApply = Math.min(balance, remaining);
        include = true;
        remaining -= amountToApply;
      }

      return {
        id: c.id,
        period: c.period,
        description: c.description,
        due_date: c.due_date,
        balance,
        expense_item: Array.isArray(c.expense_item) ? c.expense_item[0] : c.expense_item,
        include,
        amountToApply,
      };
    });

    setCharges(mapped);
    setLoadingCharges(false);
  };

  const toggleCharge = (id: string) => {
    setCharges((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, include: !c.include, amountToApply: !c.include ? c.balance : 0 }
          : c
      )
    );
  };

  const updateAmount = (id: string, value: number) => {
    setCharges((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const val = Math.max(0, Math.min(value, c.balance));
        return { ...c, amountToApply: Number(val.toFixed(2)), include: val > 0 };
      })
    );
  };

  const totalSelected = charges
    .filter((c) => c.include)
    .reduce((acc, c) => acc + c.amountToApply, 0);

  const handleAssign = () => {
    if (!selectedUnit) {
      setError("Selecciona una unidad.");
      return;
    }

    const allocations = charges
      .filter((c) => c.include && c.amountToApply > 0)
      .map((c) => ({
        charge_id: c.id,
        amount_allocated: Number(c.amountToApply.toFixed(2)),
        charge_balance: Number(c.balance),
      }));

    if (allocations.length === 0) {
      setError("Selecciona al menos un cargo para aplicar el pago.");
      return;
    }

    if (totalSelected > payment.amount) {
      setError(`El total seleccionado (${formatCurrency(totalSelected)}) excede el monto del depósito (${formatCurrency(payment.amount)}).`);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await assignUnidentifiedPayment(
        condominiumId,
        payment.id,
        selectedUnit,
        allocations
      );

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Asignar ingreso a unidad</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Info del pago no identificado */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-800">Depósito no identificado</p>
                <p className="text-xs text-amber-600">
                  Fecha: {payment.payment_date} · Referencia: {payment.reference_number || payment.bank_reference || "—"}
                </p>
              </div>
              <div className="text-lg font-bold text-amber-900">{formatCurrency(payment.amount)}</div>
            </div>
          </div>

          {/* Selección de unidad */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              <Building2 size={14} className="inline mr-1" />
              Asignar a unidad *
            </label>
            <select
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
            >
              <option value="">Selecciona la unidad</option>
              {units.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tabla de cargos */}
          {selectedUnit && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Cargos pendientes de la unidad
              </h3>
              <div className="overflow-auto border border-gray-200 rounded-lg max-h-60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-center">Pagar</th>
                      <th className="px-3 py-2 text-left">Rubro</th>
                      <th className="px-3 py-2 text-left">Periodo</th>
                      <th className="px-3 py-2 text-right">Saldo</th>
                      <th className="px-3 py-2 text-right">Aplicar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loadingCharges ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
                          Cargando cargos...
                        </td>
                      </tr>
                    ) : charges.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
                          No hay cargos pendientes en esta unidad.
                        </td>
                      </tr>
                    ) : (
                      charges.map((c) => (
                        <tr key={c.id} className={c.include ? "bg-brand/5" : ""}>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={c.include}
                              onChange={() => toggleCharge(c.id)}
                              className="rounded text-brand focus:ring-brand"
                            />
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {c.expense_item?.name || c.description || "—"}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{c.period || "—"}</td>
                          <td className="px-3 py-2 text-right text-gray-700 font-semibold">
                            {formatCurrency(c.balance)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              max={c.balance}
                              step="0.01"
                              className="w-24 border border-gray-200 rounded-md px-2 py-1 text-sm text-right"
                              value={c.amountToApply.toFixed(2)}
                              onChange={(e) =>
                                updateAmount(c.id, parseFloat(e.target.value || "0"))
                              }
                              disabled={!c.include}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Resumen */}
              <div className="mt-3 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  Total a aplicar: <span className="font-semibold text-gray-900">{formatCurrency(totalSelected)}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Restante: <span className={`font-semibold ${payment.amount - totalSelected > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatCurrency(payment.amount - totalSelected)}
                  </span>
                </div>
              </div>
              {payment.amount > totalSelected && (
                <p className="text-xs text-amber-600 mt-1">
                  El monto restante quedará como saldo a favor de la unidad.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={isPending || !selectedUnit}
            className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-md hover:bg-brand-dark disabled:opacity-60"
          >
            {isPending ? "Asignando..." : "Asignar y crear recibo"}
          </button>
        </div>
      </div>
    </div>
  );
}

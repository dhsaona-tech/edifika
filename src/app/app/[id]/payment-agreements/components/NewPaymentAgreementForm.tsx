"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, DollarSign, Hash, Calendar, Home, CheckSquare } from "lucide-react";
import { createPaymentAgreement, getUnitPendingCharges, checkUnitHasActiveAgreement } from "../actions";
import type { PaymentAgreementFormData } from "@/types/billing";

interface Props {
  condominiumId: string;
  units: Array<{ id: string; identifier: string; aliquot: number; status: string }>;
  preselectedUnitId?: string;
}

interface PendingCharge {
  id: string;
  description: string | null;
  total_amount: number;
  balance: number;
  due_date: string;
  charge_type: string;
  expense_item?: { name: string } | null;
}

export default function NewPaymentAgreementForm({ condominiumId, units, preselectedUnitId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [selectedUnitId, setSelectedUnitId] = useState<string>(preselectedUnitId || "");
  const [pendingCharges, setPendingCharges] = useState<PendingCharge[]>([]);
  const [selectedChargeIds, setSelectedChargeIds] = useState<Set<string>>(new Set());
  const [isLoadingCharges, setIsLoadingCharges] = useState(false);
  const [hasActiveAgreement, setHasActiveAgreement] = useState(false);

  const [downPayment, setDownPayment] = useState<number>(0);
  const [installments, setInstallments] = useState<number>(6);
  const [freezeLateFees, setFreezeLateFees] = useState<boolean>(true);

  const activeUnits = units.filter((u) => u.status === "activa");

  // Cargar cargos pendientes cuando cambia la unidad
  useEffect(() => {
    if (!selectedUnitId) {
      setPendingCharges([]);
      setSelectedChargeIds(new Set());
      setHasActiveAgreement(false);
      return;
    }

    const loadCharges = async () => {
      setIsLoadingCharges(true);
      setError(null);

      const [charges, hasActive] = await Promise.all([
        getUnitPendingCharges(condominiumId, selectedUnitId),
        checkUnitHasActiveAgreement(condominiumId, selectedUnitId),
      ]);

      setPendingCharges(charges);
      setSelectedChargeIds(new Set(charges.map((c) => c.id))); // Seleccionar todos por defecto
      setHasActiveAgreement(hasActive);
      setIsLoadingCharges(false);
    };

    loadCharges();
  }, [selectedUnitId, condominiumId]);

  // Calculos
  const selectedCharges = pendingCharges.filter((c) => selectedChargeIds.has(c.id));
  const totalDebt = selectedCharges.reduce((sum, c) => sum + c.balance, 0);
  const remainingAfterDown = Math.max(0, totalDebt - downPayment);
  const installmentAmount = installments > 0 ? remainingAfterDown / installments : 0;

  const toggleCharge = (chargeId: string) => {
    const newSet = new Set(selectedChargeIds);
    if (newSet.has(chargeId)) {
      newSet.delete(chargeId);
    } else {
      newSet.add(chargeId);
    }
    setSelectedChargeIds(newSet);
  };

  const selectAll = () => {
    setSelectedChargeIds(new Set(pendingCharges.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedChargeIds(new Set());
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (selectedChargeIds.size === 0) {
      setError("Selecciona al menos un cargo para incluir en el convenio");
      return;
    }

    if (remainingAfterDown <= 0) {
      setError("El pago inicial cubre toda la deuda. No es necesario un convenio.");
      return;
    }

    const formData = new FormData(e.currentTarget);

    const payload: PaymentAgreementFormData = {
      unit_id: selectedUnitId,
      charge_ids: Array.from(selectedChargeIds),
      down_payment: downPayment,
      installments: installments,
      start_date: formData.get("start_date") as string,
      freeze_late_fees: freezeLateFees,
      notes: formData.get("notes") as string,
    };

    startTransition(async () => {
      const result = await createPaymentAgreement(condominiumId, payload);

      if (result.error) {
        setError(result.error);
      } else {
        router.push(`/app/${condominiumId}/payment-agreements`);
      }
    });
  };

  // Generar fecha de inicio (primer dia del proximo mes)
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(1);
    return date.toISOString().split("T")[0];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {hasActiveAgreement && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          <strong>Atencion:</strong> Esta unidad ya tiene un convenio de pago activo.
          Debes cancelarlo antes de crear uno nuevo.
        </div>
      )}

      {/* Seleccion de Unidad */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Home size={18} className="text-amber-600" />
          Seleccionar Unidad
        </h2>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Unidad *
          </label>
          <select
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            required
            className="w-full md:w-1/2 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
          >
            <option value="">Seleccionar unidad</option>
            {activeUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.identifier}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cargos Pendientes */}
      {selectedUnitId && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <CheckSquare size={18} className="text-blue-600" />
              Cargos a Incluir
            </h2>
            <div className="flex gap-2 text-sm">
              <button type="button" onClick={selectAll} className="text-brand hover:underline">
                Seleccionar todos
              </button>
              <span className="text-gray-300">|</span>
              <button type="button" onClick={deselectAll} className="text-gray-500 hover:underline">
                Ninguno
              </button>
            </div>
          </div>

          {isLoadingCharges ? (
            <div className="py-8 text-center text-gray-500">Cargando cargos pendientes...</div>
          ) : pendingCharges.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              Esta unidad no tiene cargos pendientes
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left w-10"></th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                      Descripcion
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                      Vencimiento
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
                      Saldo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingCharges.map((charge) => (
                    <tr
                      key={charge.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedChargeIds.has(charge.id) ? "bg-blue-50" : ""
                      }`}
                      onClick={() => toggleCharge(charge.id)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedChargeIds.has(charge.id)}
                          onChange={() => toggleCharge(charge.id)}
                          className="w-4 h-4 text-brand rounded"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {charge.description || (charge.expense_item as any)?.name || "Cargo"}
                          </p>
                          <p className="text-xs text-gray-500">{charge.charge_type}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {new Date(charge.due_date).toLocaleDateString("es-EC")}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        ${charge.balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-2 border-t border-gray-100 flex justify-between text-sm">
            <span className="text-gray-600">
              {selectedChargeIds.size} de {pendingCharges.length} cargos seleccionados
            </span>
            <span className="font-semibold text-gray-900">Total: ${totalDebt.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Terminos del Convenio */}
      {selectedUnitId && selectedChargeIds.size > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <DollarSign size={18} className="text-green-600" />
            Terminos del Convenio
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Pago Inicial (Opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={totalDebt - 0.01}
                  value={downPayment || ""}
                  onChange={(e) => setDownPayment(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Numero de Cuotas *
              </label>
              <input
                type="number"
                min="1"
                max="60"
                required
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value) || 1)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                name="start_date"
                required
                defaultValue={getDefaultStartDate()}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="freeze_late_fees"
              checked={freezeLateFees}
              onChange={(e) => setFreezeLateFees(e.target.checked)}
              className="w-4 h-4 text-brand rounded"
            />
            <label htmlFor="freeze_late_fees" className="text-sm text-gray-700 cursor-pointer">
              Congelar mora sobre los cargos incluidos mientras el convenio este activo
            </label>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Notas (Opcional)
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Observaciones sobre el convenio..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none resize-none"
            />
          </div>

          {/* Resumen */}
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-semibold text-amber-800 mb-2">Resumen del Convenio</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-amber-600">Deuda Total</p>
                <p className="font-semibold text-amber-900">${totalDebt.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-amber-600">Pago Inicial</p>
                <p className="font-semibold text-amber-900">${downPayment.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-amber-600">Saldo a Diferir</p>
                <p className="font-semibold text-amber-900">${remainingAfterDown.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-amber-600">Cuota Mensual</p>
                <p className="font-semibold text-amber-900">${installmentAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boton Guardar */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={
            isPending ||
            hasActiveAgreement ||
            selectedChargeIds.size === 0 ||
            remainingAfterDown <= 0
          }
          className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-md transition-all shadow-sm hover:shadow-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {isPending ? "Creando..." : "Crear Convenio"}
        </button>
      </div>
    </form>
  );
}

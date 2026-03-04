"use client";

import { useState, useTransition } from "react";
import {
  ArrowLeft,
  Info,
  Clock,
  DollarSign,
  ShieldAlert,
  Users,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Amenity } from "@/types/bookings";
import type { AmenityInput } from "@/lib/bookings/schemas";
import { createAmenity, updateAmenity } from "../actions";

interface Props {
  condominiumId: string;
  amenity: Amenity | null;
  expenseItems: { id: string; name: string }[];
  onClose: () => void;
}

export default function AmenityForm({
  condominiumId,
  amenity,
  expenseItems,
  onClose,
}: Props) {
  const isEditing = !!amenity;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState(amenity?.name || "");
  const [description, setDescription] = useState(amenity?.description || "");
  const [maxCapacity, setMaxCapacity] = useState(amenity?.max_capacity || 1);

  const [requiresApproval, setRequiresApproval] = useState(
    amenity?.requires_approval ?? false
  );
  const [cancelationCutoffHours, setCancelationCutoffHours] = useState(
    amenity?.cancelation_cutoff_hours ?? 24
  );

  const [isRentable, setIsRentable] = useState(amenity?.is_rentable ?? false);
  const [rentalCost, setRentalCost] = useState(amenity?.rental_cost ?? 0);
  const [requiresGuarantee, setRequiresGuarantee] = useState(
    amenity?.requires_guarantee ?? false
  );
  const [guaranteeAmount, setGuaranteeAmount] = useState(
    amenity?.guarantee_amount ?? 0
  );
  const [expenseItemId, setExpenseItemId] = useState(
    amenity?.expense_item_id || ""
  );

  const [allowDebtors, setAllowDebtors] = useState(
    amenity?.allow_debtors ?? true
  );
  const [debtGraceDay, setDebtGraceDay] = useState(
    amenity?.debt_grace_day ?? 10
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const input: AmenityInput = {
      name,
      description,
      max_capacity: maxCapacity,
      requires_approval: requiresApproval,
      cancelation_cutoff_hours: cancelationCutoffHours,
      is_rentable: isRentable,
      rental_cost: rentalCost,
      requires_guarantee: requiresGuarantee,
      guarantee_amount: guaranteeAmount,
      expense_item_id: expenseItemId || "",
      allow_debtors: allowDebtors,
      debt_grace_day: debtGraceDay,
    };

    startTransition(async () => {
      const res = isEditing
        ? await updateAmenity(condominiumId, amenity!.id, input)
        : await createAmenity(condominiumId, input);

      if (res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-bold text-gray-900">
          {isEditing ? `Editar: ${amenity!.name}` : "Nueva Área Comunal"}
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sección 1: Información Básica */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center gap-2">
            <Info size={18} className="text-gray-600" />
            <h3 className="font-semibold text-gray-800">Información Básica</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Ej. "Zona BBQ", "Piscina", "Salón de Eventos"'
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe las reglas de uso, horarios permitidos, etc."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
              />
            </div>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users size={14} className="inline mr-1" />
                Capacidad Máxima (reservas simultáneas)
              </label>
              <input
                type="number"
                min={1}
                required
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Ej. Una piscina puede tener capacidad 20 (reservas simultáneas),
                pero un BBQ solo 1
              </p>
            </div>
          </div>
        </div>

        {/* Sección 2: Reglas de Aprobación */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-blue-50 border-b border-blue-100 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              <h3 className="font-semibold text-blue-800">
                Reglas de Aprobación y Cancelación
              </h3>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Requiere aprobación del administrador
                </label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Si está desactivado, la reserva se confirma automáticamente
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequiresApproval(!requiresApproval)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors",
                  requiresApproval ? "bg-brand" : "bg-gray-300"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                    requiresApproval && "translate-x-5"
                  )}
                />
              </button>
            </div>

            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horas límite para cancelar
              </label>
              <input
                type="number"
                min={0}
                value={cancelationCutoffHours}
                onChange={(e) =>
                  setCancelationCutoffHours(Number(e.target.value))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                El residente no podrá cancelar si faltan menos de{" "}
                {cancelationCutoffHours} horas para el evento
              </p>
            </div>
          </div>
        </div>

        {/* Sección 3: Reglas Financieras */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-green-50 border-b border-green-100 px-5 py-3 flex items-center gap-2">
            <DollarSign size={18} className="text-green-600" />
            <h3 className="font-semibold text-green-800">
              Reglas Financieras
            </h3>
          </div>
          <div className="p-5 space-y-5">
            {/* Costo de alquiler */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Tiene costo de alquiler
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Se genera un cargo no reembolsable a la unidad
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRentable(!isRentable)}
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-colors",
                    isRentable ? "bg-green-600" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                      isRentable && "translate-x-5"
                    )}
                  />
                </button>
              </div>

              {isRentable && (
                <div className="pl-4 border-l-2 border-green-200 space-y-3">
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo del alquiler ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={rentalCost}
                      onChange={(e) => setRentalCost(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                    />
                  </div>
                  <div className="max-w-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rubro contable (categoría del ingreso)
                    </label>
                    <select
                      value={expenseItemId}
                      onChange={(e) => setExpenseItemId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                    >
                      <option value="">Sin rubro específico</option>
                      {expenseItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Garantía */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Requiere depósito de garantía
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Se cobra un depósito que se devuelve o aplica como saldo a
                    favor al completar el evento
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequiresGuarantee(!requiresGuarantee)}
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-colors",
                    requiresGuarantee ? "bg-green-600" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                      requiresGuarantee && "translate-x-5"
                    )}
                  />
                </button>
              </div>

              {requiresGuarantee && (
                <div className="pl-4 border-l-2 border-green-200">
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto de la garantía ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={guaranteeAmount}
                      onChange={(e) =>
                        setGuaranteeAmount(Number(e.target.value))
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sección 4: Bloqueos por Morosidad */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-red-50 border-b border-red-100 px-5 py-3 flex items-center gap-2">
            <ShieldAlert size={18} className="text-red-600" />
            <h3 className="font-semibold text-red-800">
              Bloqueos por Morosidad
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Bloquear reservas a unidades morosas
                </label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Si está activado, las unidades con cargos pendientes no podrán
                  reservar después del día de gracia
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAllowDebtors(!allowDebtors)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors",
                  !allowDebtors ? "bg-red-600" : "bg-gray-300"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                    !allowDebtors && "translate-x-5"
                  )}
                />
              </button>
            </div>

            {!allowDebtors && (
              <div className="pl-4 border-l-2 border-red-200 max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Día de gracia (del mes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={debtGraceDay}
                  onChange={(e) => setDebtGraceDay(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Después del día {debtGraceDay} del mes, las unidades con deuda
                  serán bloqueadas de reservar este espacio
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            <CheckCircle size={16} />
            {isPending
              ? "Guardando..."
              : isEditing
                ? "Guardar Cambios"
                : "Crear Área Comunal"}
          </button>
        </div>
      </form>
    </div>
  );
}

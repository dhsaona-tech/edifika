"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, DollarSign, Hash, Calendar, Users, Plus, AlertTriangle } from "lucide-react";
import { createExtraordinaryPlan } from "../actions";
import type { ExtraordinaryPlanFormData } from "@/types/billing";

interface Props {
  condominiumId: string;
  expenseItems: Array<{ id: string; name: string; description?: string | null }>;
  units: Array<{ id: string; identifier: string; aliquot: number; status: string }>;
}

export default function NewExtraordinaryPlanForm({ condominiumId, expenseItems, units }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [distributionMethod, setDistributionMethod] = useState<"por_aliquota" | "igualitario" | "manual">("por_aliquota");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [installments, setInstallments] = useState<number>(12);
  const [manualAmounts, setManualAmounts] = useState<Record<string, number>>({});

  // Estado para crear nuevo rubro
  const [rubroMode, setRubroMode] = useState<"select" | "create">("select");
  const [newRubroName, setNewRubroName] = useState("");

  const activeUnits = units.filter((u) => u.status === "activa");

  // Calcular preview de distribuci\u00f3n
  const getPreviewDistribution = () => {
    if (totalAmount <= 0) return [];

    if (distributionMethod === "igualitario") {
      const perUnit = totalAmount / activeUnits.length;
      return activeUnits.map((u) => ({
        ...u,
        total: perUnit,
        monthly: perUnit / installments,
      }));
    }

    if (distributionMethod === "por_aliquota") {
      const totalAliquot = activeUnits.reduce((sum, u) => sum + Number(u.aliquot || 0), 0) || 1;
      return activeUnits.map((u) => {
        const share = Number(u.aliquot || 0) / totalAliquot;
        const total = totalAmount * share;
        return {
          ...u,
          total,
          monthly: total / installments,
        };
      });
    }

    // Manual
    return activeUnits.map((u) => {
      const total = manualAmounts[u.id] || 0;
      return {
        ...u,
        total,
        monthly: total / installments,
      };
    });
  };

  const previewDistribution = getPreviewDistribution();
  const manualTotal = Object.values(manualAmounts).reduce((sum, v) => sum + v, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    const payload: ExtraordinaryPlanFormData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      expense_item_id: rubroMode === "select" ? (formData.get("expense_item_id") as string) : "",
      distribution_method: distributionMethod,
      total_amount: totalAmount,
      total_installments: installments,
      start_period: formData.get("start_period") as string,
      // Campos para crear nuevo rubro
      create_new_rubro: rubroMode === "create",
      new_rubro_name: rubroMode === "create" ? newRubroName : undefined,
    };

    if (distributionMethod === "manual") {
      payload.unit_amounts = Object.entries(manualAmounts)
        .filter(([_, amount]) => amount > 0)
        .map(([unit_id, total_amount]) => ({ unit_id, total_amount }));
    }

    startTransition(async () => {
      const result = await createExtraordinaryPlan(condominiumId, payload);

      if (result.error) {
        setError(result.error);
      } else {
        router.push(`/app/${condominiumId}/extraordinary-plans`);
      }
    });
  };

  // Generar opciones de per\u00edodo (pr\u00f3ximos 12 meses)
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    const label = date.toLocaleDateString("es-EC", { month: "long", year: "numeric" });
    return { value, label };
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Informaci\u00f3n B\u00e1sica */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Calendar size={18} className="text-purple-600" />
          Informaci\u00f3n del Plan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Nombre del Plan *
            </label>
            <input
              name="name"
              type="text"
              required
              placeholder="Ej: Pintura de Fachada 2024"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Rubro Extraordinario *
            </label>

            {/* Toggle entre seleccionar y crear */}
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setRubroMode("select")}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  rubroMode === "select"
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Seleccionar existente
              </button>
              <button
                type="button"
                onClick={() => setRubroMode("create")}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors flex items-center justify-center gap-1 ${
                  rubroMode === "create"
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Plus size={14} />
                Crear nuevo
              </button>
            </div>

            {rubroMode === "select" ? (
              <select
                name="expense_item_id"
                required={rubroMode === "select"}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
              >
                <option value="">Seleccionar rubro extraordinario</option>
                {expenseItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={newRubroName}
                onChange={(e) => setNewRubroName(e.target.value)}
                required={rubroMode === "create"}
                placeholder="Nombre del nuevo rubro (ej: Pintura Exterior)"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
              />
            )}

            {expenseItems.length === 0 && rubroMode === "select" && (
              <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-800">
                  No hay rubros extraordinarios disponibles. Crea uno nuevo para este proyecto.
                </p>
              </div>
            )}

            <p className="text-[10px] text-gray-500 mt-1">
              Los proyectos solo pueden usar rubros extraordinarios (no del presupuesto ordinario).
              {rubroMode === "create" && " Se creará automáticamente el rubro al guardar."}
            </p>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Descripci\u00f3n
            </label>
            <textarea
              name="description"
              rows={2}
              placeholder="Descripci\u00f3n del proyecto o gasto extraordinario..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Montos y Cuotas */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <DollarSign size={18} className="text-green-600" />
          Montos y Cuotas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Monto Total *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={totalAmount || ""}
                onChange={(e) => setTotalAmount(Number(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              N\u00famero de Cuotas *
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
              Per\u00edodo de Inicio *
            </label>
            <select
              name="start_period"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none capitalize"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="capitalize">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* M\u00e9todo de Distribuci\u00f3n */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Users size={18} className="text-blue-600" />
          Distribuci\u00f3n por Unidad
        </h2>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="distribution"
              checked={distributionMethod === "por_aliquota"}
              onChange={() => setDistributionMethod("por_aliquota")}
              className="w-4 h-4 text-brand"
            />
            <span className="text-sm">Por Al\u00edcuota</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="distribution"
              checked={distributionMethod === "igualitario"}
              onChange={() => setDistributionMethod("igualitario")}
              className="w-4 h-4 text-brand"
            />
            <span className="text-sm">Igualitario</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="distribution"
              checked={distributionMethod === "manual"}
              onChange={() => setDistributionMethod("manual")}
              className="w-4 h-4 text-brand"
            />
            <span className="text-sm">Manual</span>
          </label>
        </div>

        {distributionMethod === "manual" && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Total asignado:</strong> ${manualTotal.toFixed(2)} de ${totalAmount.toFixed(2)}
              {manualTotal !== totalAmount && (
                <span className="text-red-600 ml-2">
                  (Diferencia: ${(totalAmount - manualTotal).toFixed(2)})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Preview de distribuci\u00f3n */}
        {totalAmount > 0 && (
          <div className="mt-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Unidad</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Al\u00edcuota</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Cuota Mensual</th>
                  {distributionMethod === "manual" && (
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Monto</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewDistribution.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{unit.identifier}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{unit.aliquot?.toFixed(4)}%</td>
                    <td className="px-3 py-2 text-right text-gray-900">${unit.total.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">${unit.monthly.toFixed(2)}</td>
                    {distributionMethod === "manual" && (
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={manualAmounts[unit.id] || ""}
                          onChange={(e) =>
                            setManualAmounts({
                              ...manualAmounts,
                              [unit.id]: Number(e.target.value) || 0,
                            })
                          }
                          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                          placeholder="0.00"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bot\u00f3n Guardar */}
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
          disabled={isPending || (distributionMethod === "manual" && Math.abs(manualTotal - totalAmount) > 0.01)}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-md transition-all shadow-sm hover:shadow-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {isPending ? "Guardando..." : "Crear Plan (Borrador)"}
        </button>
      </div>
    </form>
  );
}

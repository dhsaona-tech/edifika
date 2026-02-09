"use client";

import { useState, useTransition } from "react";
import { Save, Percent, DollarSign, Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { saveBillingSettings, generateLateFeeCharges } from "../actions";
import SuccessMessage from "@/components/ui/SuccessMessage";
import ErrorMessage from "@/components/ui/ErrorMessage";
import type { CondominiumBillingSettings, BillingSettingsFormData } from "@/types/billing";

interface Props {
  condominiumId: string;
  initialData: CondominiumBillingSettings | null;
}

export default function BillingSettingsForm({ condominiumId, initialData }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isGeneratingFees, setIsGeneratingFees] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estado del formulario
  const [earlyPaymentEnabled, setEarlyPaymentEnabled] = useState(
    initialData?.early_payment_enabled ?? false
  );
  const [lateFeeEnabled, setLateFeeEnabled] = useState(initialData?.late_fee_enabled ?? false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData(e.currentTarget);

    const payload: BillingSettingsFormData = {
      early_payment_enabled: earlyPaymentEnabled,
      early_payment_type: formData.get("early_payment_type") as "porcentaje" | "monto_fijo",
      early_payment_value: Number(formData.get("early_payment_value")) || 0,
      early_payment_cutoff_day: Number(formData.get("early_payment_cutoff_day")) || 10,

      late_fee_enabled: lateFeeEnabled,
      late_fee_type: formData.get("late_fee_type") as "porcentaje" | "monto_fijo",
      late_fee_value: Number(formData.get("late_fee_value")) || 0,
      late_fee_grace_days: Number(formData.get("late_fee_grace_days")) || 0,
      late_fee_apply_on: (formData.get("late_fee_apply_on") as "balance" | "total") || "balance",
      late_fee_max_rate: formData.get("late_fee_max_rate")
        ? Number(formData.get("late_fee_max_rate"))
        : null,
      late_fee_compound: formData.get("late_fee_compound") === "on",

      default_due_day: Number(formData.get("default_due_day")) || 15,
      auto_generate_charges: formData.get("auto_generate_charges") === "on",
    };

    startTransition(async () => {
      const result = await saveBillingSettings(condominiumId, payload);

      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Configuracion guardada correctamente" });
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const handleGenerateLateFees = async () => {
    if (
      !confirm(
        "Generar cargos de mora para todos los cobros vencidos? Esta accion creara nuevos cargos."
      )
    ) {
      return;
    }

    setIsGeneratingFees(true);
    setMessage(null);

    const result = await generateLateFeeCharges(condominiumId);

    setIsGeneratingFees(false);

    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({
        type: "success",
        text: `Se generaron ${result.charges_created} cargos de mora por un total de $${result.total_late_fees?.toFixed(2)}`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div>
          {message.type === "success" ? (
            <SuccessMessage message={message.text} onDismiss={() => setMessage(null)} />
          ) : (
            <ErrorMessage message={message.text} onDismiss={() => setMessage(null)} />
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seccion: Pronto Pago */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="bg-green-50 border-b border-green-100 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              <h2 className="font-semibold text-green-800">Descuento por Pronto Pago</h2>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={earlyPaymentEnabled}
                onChange={(e) => setEarlyPaymentEnabled(e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-green-700 font-medium">Activar</span>
            </label>
          </div>

          {earlyPaymentEnabled && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Tipo de Descuento
                </label>
                <select
                  name="early_payment_type"
                  defaultValue={initialData?.early_payment_type || "porcentaje"}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
                >
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="monto_fijo">Monto Fijo ($)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Valor del Descuento
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="early_payment_value"
                    step="0.01"
                    min="0"
                    defaultValue={initialData?.early_payment_value || 5}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none pr-8"
                  />
                  <Percent
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
                <p className="text-xs text-gray-500">Ej: 5% o $10.00</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Dia Limite del Mes
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="early_payment_cutoff_day"
                    min="1"
                    max="28"
                    defaultValue={initialData?.early_payment_cutoff_day || 10}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500">Pagar antes del dia X para aplicar descuento</p>
              </div>
            </div>
          )}

          {!earlyPaymentEnabled && (
            <div className="p-5 text-center text-gray-500 text-sm">
              El descuento por pronto pago esta desactivado
            </div>
          )}
        </div>

        {/* Seccion: Mora/Interes */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="bg-red-50 border-b border-red-100 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600" />
              <h2 className="font-semibold text-red-800">Interes por Mora</h2>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lateFeeEnabled}
                onChange={(e) => setLateFeeEnabled(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className="text-sm text-red-700 font-medium">Activar</span>
            </label>
          </div>

          {lateFeeEnabled && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Tipo de Mora
                  </label>
                  <select
                    name="late_fee_type"
                    defaultValue={initialData?.late_fee_type || "porcentaje"}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
                  >
                    <option value="porcentaje">Porcentaje Mensual (%)</option>
                    <option value="monto_fijo">Monto Fijo ($)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Valor de Mora
                  </label>
                  <input
                    type="number"
                    name="late_fee_value"
                    step="0.01"
                    min="0"
                    defaultValue={initialData?.late_fee_value || 2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
                  />
                  <p className="text-xs text-gray-500">Ej: 2% mensual o $5.00 fijo</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Dias de Gracia
                  </label>
                  <input
                    type="number"
                    name="late_fee_grace_days"
                    min="0"
                    max="30"
                    defaultValue={initialData?.late_fee_grace_days || 5}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
                  />
                  <p className="text-xs text-gray-500">Dias despues del vencimiento sin mora</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Calcular Sobre
                  </label>
                  <select
                    name="late_fee_apply_on"
                    defaultValue={initialData?.late_fee_apply_on || "balance"}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
                  >
                    <option value="balance">Saldo Pendiente</option>
                    <option value="total">Monto Original</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Tope Maximo (%)
                  </label>
                  <input
                    type="number"
                    name="late_fee_max_rate"
                    step="0.01"
                    min="0"
                    max="100"
                    defaultValue={initialData?.late_fee_max_rate || ""}
                    placeholder="Sin tope"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
                  />
                  <p className="text-xs text-gray-500">Mora maxima como % del total</p>
                </div>

                <div className="space-y-1 flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer py-2">
                    <input
                      type="checkbox"
                      name="late_fee_compound"
                      defaultChecked={initialData?.late_fee_compound ?? false}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Interes compuesto</span>
                  </label>
                </div>
              </div>

              {/* Boton para generar mora manualmente */}
              <div className="pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleGenerateLateFees}
                  disabled={isGeneratingFees}
                  className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  <Clock size={14} />
                  {isGeneratingFees ? "Generando..." : "Generar mora ahora (manual)"}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Genera cargos de mora para todos los cobros vencidos segun la configuracion actual
                </p>
              </div>
            </div>
          )}

          {!lateFeeEnabled && (
            <div className="p-5 text-center text-gray-500 text-sm">
              El cobro de interes por mora esta desactivado
            </div>
          )}
        </div>

        {/* Seccion: Configuracion General */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-600" />
              <h2 className="font-semibold text-gray-800">Configuracion General</h2>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Dia de Vencimiento por Defecto
              </label>
              <input
                type="number"
                name="default_due_day"
                min="1"
                max="28"
                defaultValue={initialData?.default_due_day || 15}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
              />
              <p className="text-xs text-gray-500">Dia del mes para vencimiento de cargos</p>
            </div>

            <div className="space-y-1 flex items-end">
              <label className="flex items-center gap-2 cursor-pointer py-2">
                <input
                  type="checkbox"
                  name="auto_generate_charges"
                  defaultChecked={initialData?.auto_generate_charges ?? false}
                  className="w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand"
                />
                <span className="text-sm text-gray-700">
                  Generacion automatica de cargos mensuales
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Boton Guardar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-6 py-2.5 rounded-md transition-all shadow-sm hover:shadow-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isPending ? "Guardando..." : "Guardar Configuracion"}
          </button>
        </div>
      </form>
    </div>
  );
}

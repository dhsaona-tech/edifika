"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveBudget } from "../actions";
import { BudgetStatus, BudgetType, DistributionMethod } from "@/types/budget";
import { Loader2, Plus, Pencil } from "lucide-react";

type RubroBase = { id: string; name: string };

type BudgetToEdit = {
  budgetId?: string;
  name: string;
  year: number;
  budget_type: BudgetType;
  status: BudgetStatus;
  distribution_method: DistributionMethod | null;
  total_annual_amount: number;
  rubros?: { expense_item_id: string; annual_amount: number }[];
};

type Props = {
  condominiumId: string;
  rubrosPadre: RubroBase[];
  budgetToEdit?: BudgetToEdit;
  triggerLabel?: string;
  triggerVariant?: "button" | "ghost";
};

const statusOptions: { value: BudgetStatus; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "aprobado", label: "Aprobado" },
  { value: "inactivo", label: "Inactivo" },
];

const distributionOptions: { value: DistributionMethod; label: string; note: string; tone?: "warn" }[] = [
  {
    value: "por_aliquota",
    label: "Por % de alícuota",
    note: "Recomendado: reparte el total mensual según el porcentaje de alícuota de cada unidad.",
  },
  {
    value: "igualitario",
    label: "Igualitario",
    note: "Todos pagan el mismo valor mensual. Úselo solo si todas las unidades son equivalentes y el reglamento lo permite.",
  },
  {
    value: "manual_por_unidad",
    label: "Manual por unidad",
    note: "⚠ NO RECOMENDADO: puede descuadrar el presupuesto. Úselo solo si la asamblea lo aprobó.",
    tone: "warn",
  },
];

export default function BudgetWizard({
  condominiumId,
  rubrosPadre,
  budgetToEdit,
  triggerLabel,
  triggerVariant = "button",
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const initialYear = new Date().getFullYear();

  const [formState, setFormState] = useState<BudgetToEdit>(() => ({
    budgetId: budgetToEdit?.budgetId,
    name: budgetToEdit?.name || `Presupuesto ${initialYear}`,
    year: budgetToEdit?.year || initialYear,
    budget_type: budgetToEdit?.budget_type || "global",
    status: budgetToEdit?.status || "borrador",
    distribution_method: budgetToEdit?.distribution_method || "por_aliquota",
    total_annual_amount: budgetToEdit?.total_annual_amount || 0,
    rubros: rubrosPadre.map((r) => ({
      expense_item_id: r.id,
      annual_amount:
        budgetToEdit?.rubros?.find((rb) => rb.expense_item_id === r.id)?.annual_amount || 0,
    })),
  }));

  useEffect(() => {
    // Reiniciar cuando se abre en modo crear
    if (open && !budgetToEdit) {
      setFormState((prev) => ({
        ...prev,
        budgetId: undefined,
        name: `Presupuesto ${initialYear}`,
        year: initialYear,
        budget_type: "global",
        status: "borrador",
        distribution_method: "por_aliquota",
        total_annual_amount: 0,
        rubros: rubrosPadre.map((r) => ({ expense_item_id: r.id, annual_amount: 0 })),
      }));
      setStep(1);
      setMessage(null);
    }
  }, [open, budgetToEdit, initialYear, rubrosPadre]);

  const totalAnualDetallado = useMemo(
    () => formState.rubros?.reduce((acc, r) => acc + (Number(r.annual_amount) || 0), 0) || 0,
    [formState.rubros]
  );

  const totalAnual =
    formState.budget_type === "detallado"
      ? totalAnualDetallado
      : Number(formState.total_annual_amount) || 0;
  const totalMensual = totalAnual / 12;

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const payload = {
        budgetId: formState.budgetId,
        name: formState.name.trim(),
        year: formState.year,
        budget_type: formState.budget_type,
        distribution_method: formState.distribution_method || "por_aliquota",
        status: formState.status,
        total_annual_amount: formState.budget_type === "global" ? totalAnual : undefined,
        rubros:
          formState.budget_type === "detallado"
            ? formState.rubros?.map((r) => ({
                expense_item_id: r.expense_item_id,
                annual_amount: Number(r.annual_amount) || 0,
              })) || []
            : undefined,
      };

      const result = await saveBudget(condominiumId, payload);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Presupuesto guardado correctamente" });
        setTimeout(() => {
          setOpen(false);
          setMessage(null);
        }, 900);
      }
    });
  };

  const Trigger =
    triggerVariant === "ghost" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-brand px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
      >
        <Pencil size={14} />
        {triggerLabel || "Editar presupuesto"}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-brand text-white px-3 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark shadow-sm"
      >
        <Plus size={14} />
        {triggerLabel || "Nuevo presupuesto"}
      </button>
    );

  return (
    <>
      {Trigger}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-5xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <p className="text-[11px] uppercase font-semibold text-gray-500">Presupuesto anual</p>
                <h3 className="text-lg font-bold text-gray-800">
                  {formState.budgetId ? "Editar presupuesto" : "Crear presupuesto"}
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form ref={formRef} className="p-5 space-y-4" onSubmit={(e) => e.preventDefault()}>
              <StepIndicator step={step} setStep={setStep} />

              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
                      Año *
                    </label>
                    <input
                      type="number"
                      min={2000}
                      max={2100}
                      value={formState.year}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          year: Number(e.target.value),
                          name: prev.budgetId ? prev.name : `Presupuesto ${e.target.value}`,
                        }))
                      }
                      className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
                      Nombre *
                    </label>
                    <input
                      value={formState.name}
                      onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Usa un nombre descriptivo, por ejemplo: “Presupuesto {formState.year}”.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
                      Estado
                    </label>
                    <select
                      value={formState.status}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, status: e.target.value as BudgetStatus }))
                      }
                      className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-700 font-semibold">Tipo de presupuesto</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CardOption
                      selected={formState.budget_type === "global"}
                      title="Global"
                      description="Un único total anual para todos los gastos ordinarios."
                      onClick={() => setFormState((prev) => ({ ...prev, budget_type: "global" }))}
                    />
                    <CardOption
                      selected={formState.budget_type === "detallado"}
                      title="Detallado por rubros"
                      description="Distribuye el presupuesto por rubro padre. El total se calcula automáticamente."
                      onClick={() => setFormState((prev) => ({ ...prev, budget_type: "detallado" }))}
                    />
                  </div>

                  {formState.budget_type === "global" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
                          Total anual *
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={formState.total_annual_amount}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              total_annual_amount: Number(e.target.value),
                            }))
                          }
                          className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
                        />
                      </div>
                      <SummaryBlock totalAnual={totalAnual} totalMensual={totalMensual} />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-700 font-semibold">
                          Rubros padres (solo ordinarios)
                        </p>
                        <SummaryBlock totalAnual={totalAnual} totalMensual={totalMensual} />
                      </div>
                      <div className="rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
                            <tr>
                              <th className="px-3 py-2 text-left">Rubro</th>
                              <th className="px-3 py-2 text-left">Valor anual</th>
                              <th className="px-3 py-2 text-left">Mensual</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {formState.rubros?.map((rubro, idx) => {
                              const rubroInfo = rubrosPadre.find((r) => r.id === rubro.expense_item_id);
                              const anual = Number(rubro.annual_amount) || 0;
                              const mensual = anual / 12;
                              return (
                                <tr key={rubro.expense_item_id} className="hover:bg-gray-50/70">
                                  <td className="px-3 py-2 font-semibold text-gray-800">
                                    {rubroInfo?.name || "Rubro"}
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      value={rubro.annual_amount}
                                      onChange={(e) => {
                                        const value = Number(e.target.value);
                                        setFormState((prev) => {
                                          const newRubros = [...(prev.rubros || [])];
                                          newRubros[idx] = { ...newRubros[idx], annual_amount: value };
                                          return { ...prev, rubros: newRubros };
                                        });
                                      }}
                                      className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-gray-700">
                                    {mensual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                            {formState.rubros?.length === 0 && (
                              <tr>
                                <td className="px-3 py-3 text-center text-gray-500" colSpan={3}>
                                  No hay rubros activos en este condominio.
                                </td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td className="px-3 py-3 font-semibold text-gray-800">Total</td>
                              <td className="px-3 py-3 font-semibold text-gray-800">
                                {totalAnual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-3 font-semibold text-gray-800">
                                {totalMensual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <p className="text-xs text-gray-500">
                        El total anual se calcula como la suma de los rubros. El mensual es total/12. No se
                        permite ingresar manualmente el total en modo detallado.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-800">Método de distribución de alícuota</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {distributionOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          formState.distribution_method === opt.value
                            ? "border-brand bg-brand/5 shadow-sm"
                            : "border-gray-200 hover:border-brand/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="distribution_method"
                          className="hidden"
                          checked={formState.distribution_method === opt.value}
                          onChange={() =>
                            setFormState((prev) => ({ ...prev, distribution_method: opt.value }))
                          }
                        />
                        <div className="font-semibold text-gray-900 mb-1">{opt.label}</div>
                        <p
                          className={`text-xs ${
                            opt.tone === "warn" ? "text-amber-700" : "text-gray-600"
                          }`}
                        >
                          {opt.note}
                        </p>
                      </label>
                    ))}
                  </div>
                  <div className="rounded-md border border-indigo-100 bg-indigo-50 text-indigo-800 text-sm px-3 py-2">
                    {formState.distribution_method === "por_aliquota" &&
                      "Se cobrará proporcional al % de alícuota de cada unidad."}
                    {formState.distribution_method === "igualitario" &&
                      "Se dividirá el total mensual entre todas las unidades activas por igual."}
                    {formState.distribution_method === "manual_por_unidad" &&
                      "Se permitirá asignar manualmente valores por unidad (se implementará en la siguiente etapa)."}
                  </div>
                </div>
              )}
            </form>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-600">
                Resumen: Total anual {totalAnual.toLocaleString("es-EC", { minimumFractionDigits: 2 })} | Total
                mensual {totalMensual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 border border-gray-300 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={step === 1}
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 border border-gray-300 rounded-md disabled:opacity-50"
                >
                  Atrás
                </button>
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(3, s + 1))}
                    className="bg-white text-brand border border-brand px-4 py-2 rounded-md text-xs font-bold hover:bg-brand/5"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-md text-xs font-bold shadow-md disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {isPending ? <Loader2 className="animate-spin" size={14} /> : null}
                    Guardar
                  </button>
                )}
              </div>
            </div>

            {message && (
              <div
                className={`px-5 py-3 text-sm font-semibold ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border-t border-green-100"
                    : "bg-red-50 text-red-700 border-t border-red-100"
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function StepIndicator({ step, setStep }: { step: number; setStep: (s: number) => void }) {
  const steps = [
    { id: 1, title: "Datos generales" },
    { id: 2, title: "Tipo y valores" },
    { id: 3, title: "Distribución" },
  ];

  return (
    <div className="flex items-center gap-3">
      {steps.map((s, idx) => (
        <button
          key={s.id}
          type="button"
          onClick={() => setStep(s.id)}
          className={`flex-1 rounded-lg border px-3 py-2 text-left transition ${
            step === s.id
              ? "border-brand bg-brand/5 text-brand font-semibold"
              : "border-gray-200 text-gray-700 hover:border-brand/40"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wide font-bold">{`Paso ${idx + 1}`}</div>
          <div className="text-sm">{s.title}</div>
        </button>
      ))}
    </div>
  );
}

function CardOption({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition ${
        selected ? "border-brand bg-brand/5 shadow-sm" : "border-gray-200 hover:border-brand/40"
      }`}
    >
      <div className="font-semibold text-gray-900">{title}</div>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </button>
  );
}

function SummaryBlock({ totalAnual, totalMensual }: { totalAnual: number; totalMensual: number }) {
  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-800">
      <div className="font-semibold">Resumen rápido</div>
      <p>Total anual: {totalAnual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}</p>
      <p>Total mensual: {totalMensual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}</p>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { BudgetStatus, BudgetType, DistributionMethod } from "@/types/budget";
import { saveBudget } from "../actions";
import { Loader2, Eye, EyeOff, Pencil } from "lucide-react";
import RubroManagerModal from "./RubroManagerModal";

type RubroBase = { id: string; name: string };

type RubroRow = { id: string; name: string; annual_amount: number };

type PresupuestoInicial = {
  budgetId?: string;
  name: string;
  year: number;
  budget_type: BudgetType;
  status: BudgetStatus;
  distribution_method: DistributionMethod | null;
  total_annual_amount: number;
  rubros?: { expense_item_id: string; annual_amount: number; name?: string }[];
};

type Props = {
  condominiumId: string;
  rubrosPadre: RubroBase[];
  presupuesto?: PresupuestoInicial;
};

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

export default function BudgetForm({ condominiumId, rubrosPadre, presupuesto }: Props) {
  const [isPending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mostrarMensual, setMostrarMensual] = useState(true);
  const [abrirRubros, setAbrirRubros] = useState(false);
  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState<PresupuestoInicial>(() => ({
    budgetId: presupuesto?.budgetId,
    name: presupuesto?.name || `Presupuesto ${currentYear}`,
    year: presupuesto?.year || currentYear,
    budget_type: presupuesto?.budget_type || "global",
    status: presupuesto?.status || "borrador",
    distribution_method: presupuesto?.distribution_method || "por_aliquota",
    total_annual_amount: presupuesto?.total_annual_amount || 0,
    rubros:
      rubrosPadre.map((r) => ({
        expense_item_id: r.id,
        name: r.name,
        annual_amount:
          presupuesto?.rubros?.find((rb) => rb.expense_item_id === r.id)?.annual_amount || 0,
      })) || [],
  }));

  const [rubros, setRubros] = useState<RubroRow[]>(
    () =>
      form.rubros?.map((r) => ({
        id: r.expense_item_id,
        name: r.name || rubrosPadre.find((rp) => rp.id === r.expense_item_id)?.name || "Rubro",
        annual_amount: r.annual_amount,
      })) || []
  );

  const totalAnual =
    form.budget_type === "global"
      ? Number(form.total_annual_amount) || 0
      : rubros.reduce((acc, r) => acc + (Number(r.annual_amount) || 0), 0);
  const totalMensual = totalAnual / 12;

  const manejarGuardar = () => {
    setMensaje(null);
    startTransition(async () => {
      const payload = {
        budgetId: form.budgetId,
        name: form.name.trim(),
        year: form.year,
        budget_type: form.budget_type,
        distribution_method: form.distribution_method || "por_aliquota",
        status: form.status,
        total_annual_amount: form.budget_type === "global" ? totalAnual : undefined,
        rubros:
          form.budget_type === "detallado"
            ? rubros.map((r) => ({
                expense_item_id: r.id,
                annual_amount: Number(r.annual_amount) || 0,
              }))
            : undefined,
      };

      const result = await saveBudget(condominiumId, payload);
      if (result?.error) {
        setMensaje({ type: "error", text: result.error });
      } else {
        setMensaje({ type: "success", text: "Presupuesto guardado" });
      }
    });
  };

  const rubrosOrdenados = useMemo(
    () => [...rubros].sort((a, b) => a.name.localeCompare(b.name)),
    [rubros]
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase font-semibold text-gray-500">Presupuesto anual</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            {form.budgetId ? "Editar presupuesto" : "Crear presupuesto"}
          </h1>
        </div>
        <div className="text-sm text-gray-600">
          Resumen: Anual{" "}
          <span className="font-semibold text-gray-900">
            {totalAnual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
          </span>{" "}
          · Mensual{" "}
          <span className="font-semibold text-gray-900">
            {totalMensual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">Año *</label>
          <input
            type="number"
            min={2000}
            max={2100}
            value={form.year}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                year: Number(e.target.value),
                name: prev.budgetId ? prev.name : `Presupuesto ${e.target.value}`,
              }))
            }
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">Nombre *</label>
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          />
          <p className="text-xs text-gray-500 mt-1">Ej: Presupuesto {form.year}.</p>
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">Estado</label>
          <select
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as BudgetStatus }))}
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          >
            <option value="borrador">Borrador</option>
            <option value="aprobado">Aprobado</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-gray-800">Tipo de presupuesto</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CardOption
            selected={form.budget_type === "global"}
            title="Global"
            description="Un único total anual para todos los gastos ordinarios."
            onClick={() => setForm((prev) => ({ ...prev, budget_type: "global" }))}
          />
          <CardOption
            selected={form.budget_type === "detallado"}
            title="Detallado por rubros"
            description="Distribuye el presupuesto por rubro padre. El total se calcula automáticamente."
            onClick={() => setForm((prev) => ({ ...prev, budget_type: "detallado" }))}
          />
        </div>

        {form.budget_type === "global" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">Total anual *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.total_annual_amount}
                onChange={(e) =>
                  setForm((prev) => ({
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Rubros padres (ordinarios)</p>
                <p className="text-xs text-gray-500">
                  Administra los rubros en una vista amplia. Los rubros se crean aquí y en el módulo de Rubros solo
                  se agregarán subrubros sin montos.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarMensual((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-brand px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                >
                  {mostrarMensual ? <EyeOff size={14} /> : <Eye size={14} />}
                  {mostrarMensual ? "Ocultar mensual" : "Ver mensual"}
                </button>
                <button
                  type="button"
                  onClick={() => setAbrirRubros(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-brand text-white px-3 py-2 rounded-md hover:bg-brand-dark shadow-sm"
                >
                  <Pencil size={14} />
                  Gestionar rubros
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left">Rubro</th>
                    <th className="px-3 py-2 text-left">Valor anual</th>
                    {mostrarMensual && <th className="px-3 py-2 text-left">Mensual</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rubrosOrdenados.map((rubro) => {
                    const anual = Number(rubro.annual_amount) || 0;
                    const mensual = anual / 12;
                    return (
                      <tr key={rubro.id} className="hover:bg-gray-50/70">
                        <td className="px-3 py-2 font-semibold text-gray-800">{rubro.name}</td>
                        <td className="px-3 py-2 text-gray-800">
                          {anual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                        </td>
                        {mostrarMensual && (
                          <td className="px-3 py-2 text-gray-700">
                            {mensual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {rubrosOrdenados.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-center text-gray-500" colSpan={mostrarMensual ? 3 : 2}>
                        No hay rubros activos. Abre la gestión para crear uno.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-3 py-3 font-semibold text-gray-900">Total</td>
                    <td className="px-3 py-3 font-semibold text-gray-900">
                      {totalAnual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                    </td>
                    {mostrarMensual && (
                      <td className="px-3 py-3 font-semibold text-gray-900">
                        {totalMensual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-xs text-gray-500">
              El total anual se calcula como la suma de los rubros. El mensual es total/12. No se ingresa manualmente
              el total en modo detallado.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-gray-800">Método de distribución de alícuota</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {distributionOptions.map((opt) => (
            <label
              key={opt.value}
              className={`border rounded-lg p-3 cursor-pointer transition-all ${
                form.distribution_method === opt.value
                  ? "border-brand bg-brand/5 shadow-sm"
                  : "border-gray-200 hover:border-brand/40"
              }`}
            >
              <input
                type="radio"
                name="distribution_method"
                className="hidden"
                checked={form.distribution_method === opt.value}
                onChange={() => setForm((prev) => ({ ...prev, distribution_method: opt.value }))}
              />
              <div className="font-semibold text-gray-900 mb-1">{opt.label}</div>
              <p className={`text-xs ${opt.tone === "warn" ? "text-amber-700" : "text-gray-600"}`}>{opt.note}</p>
            </label>
          ))}
        </div>
        <div className="rounded-md border border-indigo-100 bg-indigo-50 text-indigo-800 text-sm px-3 py-2">
          {form.distribution_method === "por_aliquota" &&
            "Se cobrará proporcional al % de alícuota de cada unidad."}
          {form.distribution_method === "igualitario" &&
            "Se dividirá el total mensual entre todas las unidades activas por igual."}
          {form.distribution_method === "manual_por_unidad" &&
            "Se permitirá asignar manualmente valores por unidad (siguiente etapa)."}
        </div>
      </section>

      {mensaje && (
        <div
          className={`text-sm font-semibold px-4 py-3 rounded-md ${
            mensaje.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {mensaje.text}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={manejarGuardar}
          disabled={isPending}
          className="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-md text-xs font-bold shadow-md disabled:opacity-50 inline-flex items-center gap-2"
        >
          {isPending ? <Loader2 className="animate-spin" size={14} /> : null}
          Guardar
        </button>
      </div>

      {abrirRubros && (
        <RubroManagerModal
          condominiumId={condominiumId}
          rubros={rubros}
          setRubros={setRubros}
          onClose={() => setAbrirRubros(false)}
        />
      )}
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

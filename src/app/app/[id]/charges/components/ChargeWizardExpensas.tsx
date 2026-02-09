"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearBatchYCharges, prepararExpensasPorPresupuesto } from "../actions";
import { distribuir } from "@/lib/charges/calculations";
import { UnitChargePreview } from "@/types/charges";

// Componente selector de mes/año en español
function MonthYearSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  const [year, month] = value ? value.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = e.target.value;
    onChange(`${year}-${newMonth.padStart(2, "0")}`);
  };
  
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = e.target.value;
    onChange(`${newYear}-${String(month).padStart(2, "0")}`);
  };
  
  // Generar años (desde 2020 hasta 10 años en el futuro)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear - 5 + i);
  
  return (
    <div className="flex gap-2">
      <select
        className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm"
        value={String(month).padStart(2, "0")}
        onChange={handleMonthChange}
      >
        {meses.map((mes, index) => (
          <option key={index} value={String(index + 1).padStart(2, "0")}>
            {mes}
          </option>
        ))}
      </select>
      <select
        className="w-24 border border-gray-200 rounded-md px-3 py-2 text-sm"
        value={year}
        onChange={handleYearChange}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

type Rubro = { id: string; name: string; classification?: string | null };
type UnidadBase = { unit_id: string; unit_name: string; aliquot?: number | null; contact_name?: string | null };

type Props = {
  condominiumId: string;
  rubrosIngreso: Rubro[];
  metodoDistribucion: "por_aliquota" | "igualitario";
  unidadesBase: UnidadBase[];
};

export default function ChargeWizardExpensas({ condominiumId, rubrosIngreso, metodoDistribucion, unidadesBase }: Props) {
  const router = useRouter();
  const todayIso = new Date().toISOString().slice(0, 10);
  const firstOfMonth = todayIso.slice(0, 8) + "01";
  const [rubroId, setRubroId] = useState("");
  const [period, setPeriod] = useState<string>(firstOfMonth);
  const [postedDate, setPostedDate] = useState<string>(todayIso);
  const [dueDate, setDueDate] = useState<string>(todayIso);
  const [descripcion, setDescripcion] = useState<string>("");
  const [totalPresupuesto, setTotalPresupuesto] = useState<number>(0);
  const [filas, setFilas] = useState<UnitChargePreview[]>([]);
  const [mensaje, setMensaje] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [modoExtra, setModoExtra] = useState<"manual" | "global">("manual");
  const [metodoExtra, setMetodoExtra] = useState<"por_aliquota" | "igualitario">("por_aliquota");
  const [totalExtraordinario, setTotalExtraordinario] = useState<number>(0);

  const esExpensaMensualUI = useMemo(() => {
    const rubroSel = rubrosIngreso.find((r) => r.id === rubroId);
    return (rubroSel?.name || "").toLowerCase().includes("expensa");
  }, [rubroId, rubrosIngreso]);
  const esExtraordinario = useMemo(() => {
    const rubroSel = rubrosIngreso.find((r) => r.id === rubroId);
    return (rubroSel?.classification || "").toLowerCase() === "extraordinario";
  }, [rubroId, rubrosIngreso]);

  // Autocompletar descripción solo para expensas mensuales
  useEffect(() => {
    if (esExpensaMensualUI && period) {
      startTransition(() => setDescripcion(descripcionPorDefecto(period)));
    } else if (!esExpensaMensualUI) {
      startTransition(() => setDescripcion(""));
    }
  }, [esExpensaMensualUI, period]);

  const totalSeleccionado = useMemo(
    () => filas.filter((f) => f.include).reduce((acc, f) => acc + Number(f.final_amount || 0), 0),
    [filas]
  );

  const toggleInclude = (unit_id: string) => {
    setFilas((prev) => prev.map((f) => (f.unit_id === unit_id ? { ...f, include: !f.include } : f)));
  };

  const updateAmount = (unit_id: string, amount: number) => {
    setFilas((prev) => prev.map((f) => (f.unit_id === unit_id ? { ...f, final_amount: amount } : f)));
  };

  const updateDetail = (unit_id: string, detail: string) => {
    setFilas((prev) => prev.map((f) => (f.unit_id === unit_id ? { ...f, detail } : f)));
  };

  // Recalcula automáticamente al cambiar rubro o periodo
  useEffect(() => {
    startTransition(async () => {
      const rubroSel = rubrosIngreso.find((r) => r.id === rubroId);
      const esExpensa = (rubroSel?.name || "").toLowerCase().includes("expensa");
      if (!rubroId) {
        setFilas([]);
        setTotalPresupuesto(0);
        setMensaje(null);
        return;
      }
      if (!esExpensa) {
        if (esExtraordinario && modoExtra === "global" && totalExtraordinario > 0) {
          const preview = distribuir(
            unidadesBase,
            totalExtraordinario,
            metodoExtra
          ).map((u) => ({ ...u, detail: descripcion }));
          setFilas(preview);
          setTotalPresupuesto(totalExtraordinario);
          setMensaje(null);
        } else {
          const manual = unidadesBase.map((u) => ({
            unit_id: u.unit_id,
            unit_name: u.unit_name,
            contact_name: u.contact_name || "",
            aliquot: u.aliquot,
            include: true,
            suggested_amount: 0,
            final_amount: 0,
            detail: descripcion,
          }));
          setFilas(manual);
          setTotalPresupuesto(0);
          setMensaje(null);
        }
      } else {
        if (!period) {
          setFilas([]);
          setTotalPresupuesto(0);
          setMensaje(null);
          return;
        }
        const res = await prepararExpensasPorPresupuesto(condominiumId, rubroId, period);
        const filasConDetalle =
          "error" in res
            ? []
            : res.unidades.map((u) => ({
                ...u,
                detail: descripcion,
                final_amount: u.final_amount ?? u.suggested_amount,
              }));
        setFilas(filasConDetalle);
        setTotalPresupuesto("error" in res ? 0 : res.total);
        setMensaje(
          "error" in res
            ? null
            : {
                type: "success",
                text: `Presupuesto mensual $ ${res.total.toFixed(2)} distribuido ${res.metodo === "por_aliquota" ? "por alícuota" : "igualitario"}.`,
              }
        );
      }
    });
  }, [condominiumId, rubroId, period, descripcion, rubrosIngreso, unidadesBase, esExtraordinario, modoExtra, totalExtraordinario, metodoExtra]);

  const submit = () => {
    setMensaje(null);
    if (!rubroId) return;
    if (!period) return;
    if (filas.length === 0) return;
    startTransition(async () => {
      const res = await crearBatchYCharges(condominiumId, {
        type: "expensas_mensuales",
        charge_type: "expensa_mensual",
        expense_item_id: rubroId,
        period,
        posted_date: postedDate,
        due_date: dueDate,
        description: descripcion,
        utility_bill_id: "",
        unidades: filas.map((f) => ({
          unit_id: f.unit_id,
          amount: Number(f.final_amount || 0),
          include: f.include,
          detail: f.detail || "",
        })),
      });
      if (res?.error) return;
      router.push(`/app/${condominiumId}/charges?success=expensas`);
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Expensas mensuales</h3>
          <p className="text-sm text-gray-500">
            Usa el presupuesto activo y distribuye según {metodoDistribucion === "por_aliquota" ? "alícuota" : "método igualitario"}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Rubro de ingreso *</label>
          <select
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
            value={rubroId}
            onChange={(e) => setRubroId(e.target.value)}
          >
            <option value="">Selecciona</option>
            {rubrosIngreso.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Periodo *</label>
          <MonthYearSelector
            value={period ? period.slice(0, 7) : ""}
            onChange={(value) => {
              const p = value ? `${value}-01` : "";
              setPeriod(p);
              setPostedDate(p || todayIso);
              setDueDate(p || todayIso);
            }}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Fecha emisión</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
            value={postedDate}
            onChange={(e) => setPostedDate(e.target.value)}
          />
          <p className="text-[11px] text-gray-500 mt-1">Los residentes verán el cargo desde esta fecha.</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Fecha vencimiento</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Descripción</label>
          <input
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
      </div>

      {!esExpensaMensualUI && esExtraordinario && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-gray-700">Modo de reparto</span>
          <label className="flex items-center gap-1 text-xs font-semibold text-gray-700">
            <input
              type="radio"
              name="modo_extra"
              value="manual"
              checked={modoExtra === "manual"}
              onChange={() => setModoExtra("manual")}
              className="text-brand focus:ring-brand"
            />
            Manual (ingresa valores por unidad)
          </label>
          <label className="flex items-center gap-1 text-xs font-semibold text-gray-700">
            <input
              type="radio"
              name="modo_extra"
              value="global"
              checked={modoExtra === "global"}
              onChange={() => setModoExtra("global")}
              className="text-brand focus:ring-brand"
            />
            Monto global
          </label>
          {modoExtra === "global" && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">Total</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-32 border border-gray-200 rounded-md px-2 py-1 text-sm"
                  value={totalExtraordinario}
                  onChange={(e) => setTotalExtraordinario(Number(e.target.value || 0))}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">Método</span>
                <select
                  className="border border-gray-200 rounded-md px-2 py-1 text-sm"
                  value={metodoExtra}
                  onChange={(e) => setMetodoExtra(e.target.value as "por_aliquota" | "igualitario")}
                >
                  <option value="por_aliquota">% alícuota</option>
                  <option value="igualitario">Igualitario</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {esExpensaMensualUI && totalPresupuesto > 0 && (
        <div className="text-sm text-gray-700">
          Total presupuestado: <strong>$ {totalPresupuesto.toFixed(2)}</strong> · Distribución {metodoDistribucion === "por_aliquota" ? "por alícuota" : "igualitaria"}.
        </div>
      )}

      <div className="overflow-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 text-center">Incluir</th>
              <th className="px-3 py-2 text-left">Unidad</th>
              <th className="px-3 py-2 text-left">Responsable</th>
              <th className="px-3 py-2 text-right">Alícuota %</th>
              <th className="px-3 py-2 text-left">Detalle</th>
              <th className="px-3 py-2 text-right">Valor por cobrar ($)</th>
              <th className="px-3 py-2 text-right">Valor final ($)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((f) => (
              <tr key={f.unit_id}>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={f.include}
                    onChange={() => toggleInclude(f.unit_id)}
                    className="rounded text-brand focus:ring-brand"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-gray-900">{f.unit_name}</div>
                </td>
                <td className="px-3 py-2 text-gray-700">{f.contact_name || "—"}</td>
                <td className="px-3 py-2 text-right text-gray-700">{f.aliquot ? `${f.aliquot}%` : "N/D"}</td>
                <td className="px-3 py-2">
                  <input
                    className="w-full border border-gray-200 rounded-md px-2 py-1 text-sm"
                    value={f.detail || ""}
                    onChange={(e) => updateDetail(f.unit_id, e.target.value)}
                  />
                </td>
                <td className="px-3 py-2 text-right text-gray-700 font-semibold">
                  {esExpensaMensualUI ? `$ ${f.suggested_amount.toFixed(2)}` : ""}
                </td>
                <td className="px-3 py-2 text-right text-gray-700">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-28 border border-gray-200 rounded-md px-2 py-1 text-sm text-right"
                    value={f.final_amount}
                    onChange={(e) => updateAmount(f.unit_id, Number(e.target.value || 0))}
                  />
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-center text-sm text-gray-500" colSpan={6}>
                  Calcula desde presupuesto para ver las unidades y montos.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td className="px-3 py-2" />
              <td className="px-3 py-2 font-semibold text-gray-800">Total seleccionado</td>
              <td className="px-3 py-2 text-right font-semibold text-gray-800">$ {totalSeleccionado.toFixed(2)}</td>
              <td className="px-3 py-2" colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {mensaje && mensaje.type === "success" && (
        <div className="text-sm font-semibold px-3 py-2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          {mensaje.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={isPending || filas.length === 0}
          className="bg-brand text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Generando..." : "Generar cargos"}
        </button>
      </div>
    </div>
  );
}

function descripcionPorDefecto(period: string) {
  const [year, month] = period.split("-").map(Number);
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const nombreMes = meses[(month || 1) - 1] || "";
  return `Expensa mensual ${nombreMes} ${year}`;
}

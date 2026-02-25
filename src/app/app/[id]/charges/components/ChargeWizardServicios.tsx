"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearBatchYCharges, getPeriodosGenerados } from "../actions";
import { UnitChargePreview } from "@/types/charges";
import { Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";

type Rubro = { id: string; name: string; classification?: string | null };
type UnidadBase = { unit_id: string; unit_name: string; aliquot?: number | null; contact_name?: string | null };

type Props = {
  condominiumId: string;
  rubrosIngreso: Rubro[];
  unidadesBase: UnidadBase[];
};

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

export default function ChargeWizardServicios({ condominiumId, rubrosIngreso, unidadesBase }: Props) {
  const router = useRouter();
  const todayIso = new Date().toISOString().slice(0, 10);
  const firstOfMonth = todayIso.slice(0, 8) + "01";

  const [rubroId, setRubroId] = useState("");
  const [period, setPeriod] = useState<string>(firstOfMonth);
  const [postedDate, setPostedDate] = useState<string>(todayIso);
  const [dueDate, setDueDate] = useState<string>(todayIso);
  const [descripcion, setDescripcion] = useState<string>("");
  const [filas, setFilas] = useState<UnitChargePreview[]>([]);
  const [mensaje, setMensaje] = useState<{ type: "error" | "success" | "warning"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [periodosUsados, setPeriodosUsados] = useState<string[]>([]);

  // Filtrar solo rubros que parecen ser de servicios básicos
  const rubrosServicios = useMemo(() => {
    const keywords = ["agua", "luz", "gas", "electricidad", "servicio", "consumo"];
    return rubrosIngreso.filter((r) => {
      const nombre = r.name.toLowerCase();
      return keywords.some((k) => nombre.includes(k));
    });
  }, [rubrosIngreso]);

  // Todos los rubros de ingreso como fallback
  const rubrosDisponibles = rubrosServicios.length > 0 ? rubrosServicios : rubrosIngreso;

  // Cargar periodos ya usados para este rubro
  useEffect(() => {
    if (rubroId) {
      startTransition(async () => {
        const periodos = await getPeriodosGenerados(condominiumId, rubroId);
        setPeriodosUsados(periodos);
      });
    } else {
      setPeriodosUsados([]);
    }
  }, [rubroId, condominiumId]);

  // Verificar si el periodo actual ya está usado
  const periodoYaUsado = useMemo(() => {
    return periodosUsados.includes(period);
  }, [period, periodosUsados]);

  // Inicializar filas cuando se selecciona rubro
  useEffect(() => {
    if (rubroId && !periodoYaUsado) {
      const rubroSel = rubrosDisponibles.find((r) => r.id === rubroId);
      const manual = unidadesBase.map((u) => ({
        unit_id: u.unit_id,
        unit_name: u.unit_name,
        contact_name: u.contact_name || "",
        aliquot: u.aliquot,
        include: true,
        suggested_amount: 0,
        final_amount: 0,
        detail: "",
      }));
      setFilas(manual);
      // Auto descripción
      if (rubroSel && period) {
        const [year, month] = period.split("-").map(Number);
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        setDescripcion(`${rubroSel.name} ${meses[(month || 1) - 1]} ${year}`);
      }
    } else {
      setFilas([]);
    }
  }, [rubroId, period, periodoYaUsado, rubrosDisponibles, unidadesBase]);

  const totalSeleccionado = useMemo(
    () => filas.filter((f) => f.include && f.final_amount > 0).reduce((acc, f) => acc + Number(f.final_amount || 0), 0),
    [filas]
  );

  const unidadesConValor = useMemo(
    () => filas.filter((f) => f.include && f.final_amount > 0).length,
    [filas]
  );

  const toggleInclude = (unit_id: string) => {
    setFilas((prev) => prev.map((f) => (f.unit_id === unit_id ? { ...f, include: !f.include } : f)));
  };

  const updateAmount = (unit_id: string, amount: number) => {
    setFilas((prev) => prev.map((f) => (f.unit_id === unit_id ? { ...f, final_amount: amount } : f)));
  };

  // Importar CSV
  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

        // Detectar separador (coma o punto y coma)
        const separator = lines[0]?.includes(";") ? ";" : ",";

        // Saltar header si existe
        const hasHeader = lines[0]?.toLowerCase().includes("unidad") || lines[0]?.toLowerCase().includes("monto");
        const dataLines = hasHeader ? lines.slice(1) : lines;

        const importedData = new Map<string, number>();
        let errores: string[] = [];

        dataLines.forEach((line, idx) => {
          const parts = line.split(separator).map((p) => p.trim().replace(/"/g, ""));
          if (parts.length >= 2) {
            const unidadIdentifier = parts[0];
            const monto = parseFloat(parts[1].replace(",", "."));

            if (isNaN(monto)) {
              errores.push(`Línea ${idx + 1}: monto inválido "${parts[1]}"`);
              return;
            }

            // Buscar unidad por nombre o identificador
            const unidad = unidadesBase.find(
              (u) =>
                u.unit_name.toLowerCase() === unidadIdentifier.toLowerCase() ||
                u.unit_name.toLowerCase().includes(unidadIdentifier.toLowerCase())
            );

            if (unidad) {
              importedData.set(unidad.unit_id, monto);
            } else {
              errores.push(`Línea ${idx + 1}: unidad "${unidadIdentifier}" no encontrada`);
            }
          }
        });

        if (importedData.size > 0) {
          setFilas((prev) =>
            prev.map((f) => ({
              ...f,
              final_amount: importedData.get(f.unit_id) ?? f.final_amount,
              include: importedData.has(f.unit_id) ? true : f.include,
            }))
          );

          const msgParts = [`${importedData.size} valores importados`];
          if (errores.length > 0) {
            msgParts.push(`${errores.length} errores`);
          }

          setMensaje({
            type: errores.length > 0 ? "warning" : "success",
            text: msgParts.join(". ") + (errores.length > 0 ? `: ${errores.slice(0, 3).join("; ")}` : ""),
          });
        } else {
          setMensaje({ type: "error", text: "No se pudieron importar datos. Verifica el formato del CSV." });
        }
      } catch {
        setMensaje({ type: "error", text: "Error al procesar el archivo CSV." });
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const submit = () => {
    setMensaje(null);
    if (!rubroId) {
      setMensaje({ type: "error", text: "Selecciona un rubro." });
      return;
    }
    if (!period) {
      setMensaje({ type: "error", text: "Selecciona un periodo." });
      return;
    }
    if (periodoYaUsado) {
      setMensaje({ type: "error", text: "Ya existen cargos para este rubro y periodo." });
      return;
    }
    if (unidadesConValor === 0) {
      setMensaje({ type: "error", text: "Ingresa al menos un valor mayor a 0." });
      return;
    }

    startTransition(async () => {
      const res = await crearBatchYCharges(condominiumId, {
        type: "servicio_basico",
        charge_type: "servicio_basico",
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
          detail: "",
        })),
      });

      if (res?.error) {
        setMensaje({ type: "error", text: res.error });
        return;
      }

      router.push(`/app/${condominiumId}/charges?success=servicios`);
    });
  };

  return (
    <div id="servicios" className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Servicios Básicos</h3>
          <p className="text-sm text-gray-500">
            Carga manual o por CSV los valores de agua, luz, gas u otros servicios.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Rubro de servicio *</label>
          <select
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
            value={rubroId}
            onChange={(e) => setRubroId(e.target.value)}
          >
            <option value="">Selecciona</option>
            {rubrosDisponibles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {rubrosServicios.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1">
              No encontramos rubros de servicios. Mostrando todos los rubros de ingreso.
            </p>
          )}
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
          {periodoYaUsado && (
            <div className="flex items-center gap-1 mt-1 text-amber-600">
              <AlertTriangle size={12} />
              <span className="text-[11px] font-medium">Ya existen cargos para este periodo</span>
            </div>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Descripción</label>
          <input
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Agua Marzo 2024"
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
      </div>

      {/* Importar CSV */}
      {rubroId && !periodoYaUsado && (
        <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-slate-500" />
            <div>
              <p className="text-xs font-semibold text-gray-700">Importar desde CSV</p>
              <p className="text-[11px] text-gray-500">Formato: unidad,monto (una línea por unidad)</p>
            </div>
          </div>
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50">
            <Upload size={14} />
            Cargar CSV
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleCSVImport}
            />
          </label>
        </div>
      )}

      {/* Tabla de unidades */}
      {rubroId && !periodoYaUsado && filas.length > 0 && (
        <div className="overflow-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-center">Incluir</th>
                <th className="px-3 py-2 text-left">Unidad</th>
                <th className="px-3 py-2 text-left">Responsable</th>
                <th className="px-3 py-2 text-right">Valor a cobrar ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filas.map((f) => (
                <tr key={f.unit_id} className={f.include ? "" : "opacity-50"}>
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
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-28 border border-gray-200 rounded-md px-2 py-1 text-sm text-right"
                      value={f.final_amount || ""}
                      onChange={(e) => updateAmount(f.unit_id, Number(e.target.value || 0))}
                      placeholder="0.00"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-3 py-2" colSpan={2} />
                <td className="px-3 py-2 text-right font-semibold text-gray-700">
                  {unidadesConValor} unidad(es)
                </td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900">
                  Total: $ {totalSeleccionado.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {mensaje && (
        <div
          className={`text-sm font-medium px-3 py-2 rounded-md border ${
            mensaje.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : mensaje.type === "warning"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {mensaje.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={isPending || !rubroId || periodoYaUsado || unidadesConValor === 0}
          className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-purple-700 disabled:opacity-50"
        >
          {isPending ? "Generando..." : "Generar cargos de servicio"}
        </button>
      </div>
    </div>
  );
}

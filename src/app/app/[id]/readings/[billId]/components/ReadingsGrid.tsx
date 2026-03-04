"use client";

import { useState, useMemo, useRef, useTransition } from "react";
import { saveReadings, rebillSingleReading } from "../../actions";
import { formatCurrency } from "@/lib/utils";
import type { UtilityBillWithReadings } from "@/types/readings";
import { Save, RefreshCw, AlertCircle } from "lucide-react";

export default function ReadingsGrid({
  bill,
  condominiumId,
}: {
  bill: UtilityBillWithReadings;
  condominiumId: string;
}) {
  const isDraft = bill.status === "draft";
  const isBilled = bill.status === "billed";
  const avgCost = bill.average_unit_cost ?? 0;

  // Local state for editable readings
  const [localReadings, setLocalReadings] = useState(() =>
    bill.utility_readings.map((r) => ({
      ...r,
      localCurrentReading: r.current_reading,
    }))
  );
  const [isPending, startTransition] = useTransition();
  const [isRebilling, setIsRebilling] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reactive calculations
  const computed = useMemo(() => {
    return localReadings.map((r) => {
      const consumption = r.localCurrentReading - r.previous_reading;
      const amount = Math.max(0, Math.round((consumption * avgCost + Number.EPSILON) * 100) / 100);
      return { ...r, consumption, amount };
    });
  }, [localReadings, avgCost]);

  const sumConsumption = useMemo(
    () => computed.reduce((acc, r) => acc + Math.max(0, r.consumption), 0),
    [computed]
  );
  const sumAmount = useMemo(
    () => computed.reduce((acc, r) => acc + r.amount, 0),
    [computed]
  );
  const communalConsumption = useMemo(
    () => (bill.total_matrix_consumption ?? 0) - sumConsumption,
    [bill.total_matrix_consumption, sumConsumption]
  );

  const hasNegativeReadings = computed.some((r) => r.consumption < 0);
  const hasChanges = localReadings.some(
    (r) => r.localCurrentReading !== r.current_reading
  );

  const handleReadingChange = (idx: number, value: string) => {
    const numValue = Number(value) || 0;
    setLocalReadings((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, localCurrentReading: numValue } : r))
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Tab" && !e.shiftKey) {
      // Move to next row's input
      if (idx < inputRefs.current.length - 1) {
        e.preventDefault();
        inputRefs.current[idx + 1]?.focus();
        inputRefs.current[idx + 1]?.select();
      }
    } else if (e.key === "Tab" && e.shiftKey) {
      // Move to previous row's input
      if (idx > 0) {
        e.preventDefault();
        inputRefs.current[idx - 1]?.focus();
        inputRefs.current[idx - 1]?.select();
      }
    } else if (e.key === "Enter") {
      // Move down like Tab
      if (idx < inputRefs.current.length - 1) {
        e.preventDefault();
        inputRefs.current[idx + 1]?.focus();
        inputRefs.current[idx + 1]?.select();
      }
    }
  };

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await saveReadings(condominiumId, bill.id, {
        utility_bill_id: bill.id,
        readings: localReadings.map((r) => ({
          unit_id: r.unit_id,
          current_reading: r.localCurrentReading,
        })),
      });

      if ("error" in res && res.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: "Lecturas guardadas correctamente." });
        // Update local state to match saved
        setLocalReadings((prev) =>
          prev.map((r) => ({ ...r, current_reading: r.localCurrentReading }))
        );
      }
    });
  };

  const handleRebill = (readingId: string) => {
    setMessage(null);
    setIsRebilling(readingId);
    startTransition(async () => {
      const res = await rebillSingleReading(condominiumId, bill.id, readingId);
      setIsRebilling(null);
      if ("error" in res && res.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: "Re-facturación exitosa." });
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Actions bar */}
      {isDraft && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasNegativeReadings && (
              <span className="inline-flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                <AlertCircle size={13} />
                Hay lecturas negativas (actual &lt; anterior)
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 text-xs font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save size={13} />
            {isPending ? "Guardando..." : "Guardar Lecturas"}
          </button>
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-semibold w-[30%]">Unidad</th>
              <th className="text-right px-4 py-3 font-semibold">Anterior</th>
              <th className="text-right px-4 py-3 font-semibold">
                Actual {isDraft && <span className="text-blue-500">(editable)</span>}
              </th>
              <th className="text-right px-4 py-3 font-semibold">
                Consumo ({bill.unit_of_measure || "u"})
              </th>
              <th className="text-right px-4 py-3 font-semibold">Monto ($)</th>
              {isBilled && <th className="text-center px-4 py-3 font-semibold">Cargo</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {computed.map((r, idx) => {
              const isNegative = r.consumption < 0;
              const chargeVoided =
                isBilled &&
                r.charge?.status &&
                (r.charge.status === "cancelado" || r.charge.status === "eliminado");

              return (
                <tr
                  key={r.id}
                  className={`transition-colors ${
                    isNegative
                      ? "bg-red-50/50"
                      : "hover:bg-gray-50/70"
                  }`}
                >
                  {/* Unit */}
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {r.unit?.full_identifier || r.unit?.identifier || r.unit_id.slice(0, 8)}
                  </td>

                  {/* Previous */}
                  <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">
                    {r.previous_reading.toLocaleString("es-EC")}
                  </td>

                  {/* Current (editable in draft) */}
                  <td className="px-4 py-2.5 text-right">
                    {isDraft ? (
                      <input
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type="number"
                        step="0.01"
                        value={r.localCurrentReading || ""}
                        onChange={(e) => handleReadingChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        onFocus={(e) => e.target.select()}
                        className={`w-28 text-right border rounded px-2 py-1 text-sm font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand ${
                          isNegative
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-gray-200"
                        }`}
                      />
                    ) : (
                      <span className="tabular-nums font-medium">
                        {r.current_reading.toLocaleString("es-EC")}
                      </span>
                    )}
                  </td>

                  {/* Consumption */}
                  <td
                    className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                      isNegative ? "text-red-600" : r.consumption > 0 ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {r.consumption.toLocaleString("es-EC")}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {formatCurrency(r.amount)}
                  </td>

                  {/* Charge status (billed only) */}
                  {isBilled && (
                    <td className="px-4 py-2.5 text-center">
                      {chargeVoided ? (
                        <button
                          onClick={() => handleRebill(r.id)}
                          disabled={isPending || isRebilling === r.id}
                          className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded px-2 py-1"
                        >
                          <RefreshCw
                            size={11}
                            className={isRebilling === r.id ? "animate-spin" : ""}
                          />
                          Re-facturar
                        </button>
                      ) : r.charge_id ? (
                        <span className="inline-block text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
                          Activo
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          {/* Footer totals */}
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr className="font-bold text-sm">
              <td className="px-4 py-3 text-gray-700">TOTALES</td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-right tabular-nums">
                {sumConsumption.toLocaleString("es-EC")}{" "}
                <span className="text-xs font-normal text-gray-500">
                  {bill.unit_of_measure}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatCurrency(sumAmount)}
              </td>
              {isBilled && <td></td>}
            </tr>
            <tr className="text-xs text-gray-500">
              <td className="px-4 pb-3" colSpan={3}>
                Consumo Comunal (Matriz - Unidades)
              </td>
              <td
                className={`px-4 pb-3 text-right font-bold tabular-nums ${
                  communalConsumption < 0 ? "text-red-600" : "text-amber-600"
                }`}
              >
                {communalConsumption.toLocaleString("es-EC")}{" "}
                {bill.unit_of_measure}
              </td>
              <td className="px-4 pb-3 text-right font-bold tabular-nums text-amber-600">
                {formatCurrency(communalConsumption * avgCost)}
              </td>
              {isBilled && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Help text */}
      {isDraft && (
        <p className="text-xs text-gray-400">
          Usa Tab o Enter para navegar entre filas. Los cálculos se actualizan en tiempo real.
          Presiona &quot;Guardar Lecturas&quot; para persistir los cambios.
        </p>
      )}
    </div>
  );
}

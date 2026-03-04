"use client";

import { useState, useTransition } from "react";
import { updateBillHeader } from "../../actions";
import { formatCurrency } from "@/lib/utils";
import type { UtilityBillWithReadings } from "@/types/readings";
import { Pencil, Check, X } from "lucide-react";

const modeLabels: Record<string, string> = {
  meter_based: "Medidor",
  allocation: "Distribución",
};

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return `${meses[Number(month) - 1]} ${year}`;
}

export default function BillHeader({
  bill,
  condominiumId,
}: {
  bill: UtilityBillWithReadings;
  condominiumId: string;
}) {
  const isDraft = bill.status === "draft";
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable fields
  const [totalAmount, setTotalAmount] = useState(bill.total_amount.toString());
  const [totalMatrix, setTotalMatrix] = useState(
    bill.total_matrix_consumption?.toString() || ""
  );
  const [unitOfMeasure, setUnitOfMeasure] = useState(bill.unit_of_measure || "m3");
  const [invoiceNumber, setInvoiceNumber] = useState(bill.invoice_number || "");

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const payload: Record<string, unknown> = {};
      if (Number(totalAmount) !== bill.total_amount) payload.total_amount = Number(totalAmount);
      if (bill.mode === "meter_based" && Number(totalMatrix) !== bill.total_matrix_consumption) {
        payload.total_matrix_consumption = Number(totalMatrix);
      }
      if (unitOfMeasure !== bill.unit_of_measure) payload.unit_of_measure = unitOfMeasure;
      if (invoiceNumber !== (bill.invoice_number || "")) payload.invoice_number = invoiceNumber;

      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }

      const res = await updateBillHeader(condominiumId, bill.id, payload);
      if ("error" in res && res.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setEditing(false);
      }
    });
  };

  // Calcular sumarios
  const sumConsumption = bill.utility_readings.reduce(
    (acc, r) => acc + (r.current_reading - r.previous_reading),
    0
  );
  const sumAmount = bill.utility_readings.reduce((acc, r) => acc + r.calculated_amount, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">
            {bill.expense_item?.name || "Servicio"} — {formatPeriod(bill.period)}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Modo: {modeLabels[bill.mode]} | Creada: {new Date(bill.created_at).toLocaleDateString("es-EC")}
            {bill.invoice_number && ` | Factura: ${bill.invoice_number}`}
          </p>
        </div>
        {isDraft && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Pencil size={13} />
            Editar
          </button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <Check size={13} />
              {isPending ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-600"
            >
              <X size={13} />
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`px-3 py-2 rounded-lg text-xs font-medium ${
            message.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Amount */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Total a Pagar</p>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm font-bold"
            />
          ) : (
            <p className="text-lg font-bold text-gray-900 mt-1">
              {formatCurrency(bill.total_amount)}
            </p>
          )}
        </div>

        {/* Meter-based specific fields */}
        {bill.mode === "meter_based" && (
          <>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase">
                Consumo Matriz ({editing ? (
                  <select
                    value={unitOfMeasure}
                    onChange={(e) => setUnitOfMeasure(e.target.value)}
                    className="inline border border-gray-300 rounded px-1 text-[10px]"
                  >
                    <option value="m3">m3</option>
                    <option value="kWh">kWh</option>
                    <option value="galones">gal</option>
                    <option value="kg">kg</option>
                  </select>
                ) : (
                  bill.unit_of_measure || "m3"
                )})
              </p>
              {editing ? (
                <input
                  type="number"
                  step="0.01"
                  value={totalMatrix}
                  onChange={(e) => setTotalMatrix(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm font-bold"
                />
              ) : (
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {bill.total_matrix_consumption?.toLocaleString("es-EC") || "—"}
                </p>
              )}
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-[10px] font-bold text-blue-600 uppercase">Costo Unitario Promedio</p>
              <p className="text-lg font-bold text-blue-700 mt-1">
                ${bill.average_unit_cost?.toFixed(6) || "—"}
              </p>
              <p className="text-[10px] text-blue-500">por {bill.unit_of_measure || "unidad"}</p>
            </div>

            <div
              className={`rounded-lg p-3 ${
                (bill.communal_consumption ?? 0) < 0
                  ? "bg-red-50"
                  : "bg-amber-50"
              }`}
            >
              <p
                className={`text-[10px] font-bold uppercase ${
                  (bill.communal_consumption ?? 0) < 0
                    ? "text-red-600"
                    : "text-amber-600"
                }`}
              >
                Consumo Comunal
              </p>
              <p
                className={`text-lg font-bold mt-1 ${
                  (bill.communal_consumption ?? 0) < 0
                    ? "text-red-700"
                    : "text-amber-700"
                }`}
              >
                {bill.communal_consumption?.toLocaleString("es-EC") ?? "—"}{" "}
                {bill.unit_of_measure || ""}
              </p>
              <p className="text-[10px] text-gray-500">
                Matriz ({bill.total_matrix_consumption}) - Unidades ({sumConsumption.toLocaleString("es-EC")})
              </p>
            </div>
          </>
        )}

        {/* Allocation specific */}
        {bill.mode === "allocation" && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-[10px] font-bold text-blue-600 uppercase">Método</p>
            <p className="text-lg font-bold text-blue-700 mt-1">
              {bill.allocation_method === "igualitario" ? "Igualitario" : "Por Alícuota"}
            </p>
          </div>
        )}
      </div>

      {/* Line items desglose (if present) */}
      {bill.line_items && bill.line_items.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Desglose de Factura</p>
          <div className="space-y-1">
            {bill.line_items.map((li, idx) => (
              <div key={idx} className="flex justify-between text-xs text-gray-600">
                <span>{li.description}</span>
                <span className="font-medium">{formatCurrency(li.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {bill.notes && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Notas</p>
          <p className="text-xs text-gray-600">{bill.notes}</p>
        </div>
      )}
    </div>
  );
}

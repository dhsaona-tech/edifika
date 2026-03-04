"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUtilityBill } from "../actions";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Rubro {
  id: string;
  name: string;
  description: string | null;
  allocation_method: string;
}

interface LineItem {
  description: string;
  amount: string;
}

export default function NewBillForm({
  condominiumId,
  rubros,
}: {
  condominiumId: string;
  rubros: Rubro[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [mode, setMode] = useState<"meter_based" | "allocation">("meter_based");
  const [expenseItemId, setExpenseItemId] = useState("");
  const [period, setPeriod] = useState("");
  const [unitOfMeasure, setUnitOfMeasure] = useState("m3");
  const [totalMatrixConsumption, setTotalMatrixConsumption] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [allocationMethod, setAllocationMethod] = useState<"por_aliquota" | "igualitario">(
    "por_aliquota"
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showLineItems, setShowLineItems] = useState(false);

  const lineItemsSum = lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
  const totalAmountNum = Number(totalAmount) || 0;
  const lineItemsMismatch =
    showLineItems && lineItems.length > 0 && Math.abs(lineItemsSum - totalAmountNum) > 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const payload = {
        condominium_id: condominiumId,
        expense_item_id: expenseItemId,
        mode,
        period: period ? `${period}-01` : "",
        total_amount: Number(totalAmount),
        ...(mode === "meter_based" && {
          unit_of_measure: unitOfMeasure,
          total_matrix_consumption: Number(totalMatrixConsumption),
        }),
        ...(mode === "allocation" && {
          allocation_method: allocationMethod,
        }),
        ...(invoiceNumber && { invoice_number: invoiceNumber }),
        ...(invoiceDate && { invoice_date: invoiceDate }),
        ...(notes && { notes }),
        ...(showLineItems &&
          lineItems.length > 0 && {
            line_items: lineItems
              .filter((li) => li.description && li.amount)
              .map((li) => ({
                description: li.description,
                amount: Number(li.amount),
              })),
          }),
      };

      const res = await createUtilityBill(condominiumId, payload);

      if ("error" in res && res.error) {
        setMessage({ type: "error", text: res.error });
      } else if ("billId" in res && res.billId) {
        router.push(`/app/${condominiumId}/readings/${res.billId}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Back link */}
      <Link
        href={`/app/${condominiumId}/readings`}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand transition-colors"
      >
        <ArrowLeft size={14} />
        Volver a lecturas
      </Link>

      <h1 className="text-2xl font-semibold">Nueva Lectura de Servicio</h1>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Modo */}
      <div>
        <label className="text-[11px] font-bold text-gray-600 uppercase mb-2 block">
          Modo de distribución
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setMode("meter_based")}
            className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
              mode === "meter_based"
                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <div className="font-semibold">Medidor</div>
            <div className="text-xs mt-0.5 opacity-70">
              Cada unidad tiene sub-medidor
            </div>
          </button>
          <button
            type="button"
            onClick={() => setMode("allocation")}
            className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
              mode === "allocation"
                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <div className="font-semibold">Distribución</div>
            <div className="text-xs mt-0.5 opacity-70">
              Dividir por alícuota o igualitario
            </div>
          </button>
        </div>
      </div>

      {/* Grid 2 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rubro */}
        <div>
          <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
            Rubro de Gasto *
          </label>
          <select
            value={expenseItemId}
            onChange={(e) => setExpenseItemId(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          >
            <option value="">Seleccionar rubro...</option>
            {rubros.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Periodo */}
        <div>
          <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
            Periodo *
          </label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>

        {/* Monto total */}
        <div>
          <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
            Monto Total a Pagar ($) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            required
            placeholder="724.22"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>

        {/* Campos condicionales: Medidor */}
        {mode === "meter_based" && (
          <>
            <div>
              <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
                Unidad de Medida *
              </label>
              <select
                value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="m3">m3 (metros cúbicos)</option>
                <option value="kWh">kWh (kilovatios hora)</option>
                <option value="galones">Galones</option>
                <option value="litros">Litros</option>
                <option value="kg">kg (kilogramos)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
                Consumo Matriz (Total Factura) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={totalMatrixConsumption}
                onChange={(e) => setTotalMatrixConsumption(e.target.value)}
                required
                placeholder="731"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
              {totalMatrixConsumption && totalAmount && (
                <p className="text-xs text-gray-400 mt-1">
                  Costo unitario promedio: $
                  {(Number(totalAmount) / Number(totalMatrixConsumption)).toFixed(6)}{" "}
                  / {unitOfMeasure}
                </p>
              )}
            </div>
          </>
        )}

        {/* Campos condicionales: Distribución */}
        {mode === "allocation" && (
          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
              Método de Distribución *
            </label>
            <select
              value={allocationMethod}
              onChange={(e) =>
                setAllocationMethod(e.target.value as "por_aliquota" | "igualitario")
              }
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              <option value="por_aliquota">Por Alícuota</option>
              <option value="igualitario">Igualitario</option>
            </select>
          </div>
        )}
      </div>

      {/* Referencia factura */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
            N.° Factura (opcional)
          </label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="001-012-062296961"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
            Fecha Factura (opcional)
          </label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>
      </div>

      {/* Line items (desglose opcional) */}
      <div>
        <button
          type="button"
          onClick={() => setShowLineItems(!showLineItems)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {showLineItems ? "Ocultar desglose" : "Agregar desglose de factura (opcional)"}
        </button>

        {showLineItems && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-400">
              Desglosa los conceptos de la factura. El sistema usará el monto total para los cálculos.
            </p>
            {lineItems.map((li, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={li.description}
                  onChange={(e) => {
                    const copy = [...lineItems];
                    copy[idx].description = e.target.value;
                    setLineItems(copy);
                  }}
                  placeholder="Ej: Agua Potable"
                  className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  value={li.amount}
                  onChange={(e) => {
                    const copy = [...lineItems];
                    copy[idx].amount = e.target.value;
                    setLineItems(copy);
                  }}
                  placeholder="521.01"
                  className="w-32 border border-gray-200 rounded-md px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLineItems([...lineItems, { description: "", amount: "" }])}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus size={12} />
              Agregar línea
            </button>

            {lineItemsMismatch && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                La suma del desglose (${lineItemsSum.toFixed(2)}) no coincide con el monto
                total (${totalAmountNum.toFixed(2)}). El sistema usará el monto total.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Notas */}
      <div>
        <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
          Notas (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Observaciones adicionales..."
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 text-white px-6 py-2.5 text-sm font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isPending ? "Creando..." : "Crear Lectura"}
        </button>
        <Link
          href={`/app/${condominiumId}/readings`}
          className="px-6 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

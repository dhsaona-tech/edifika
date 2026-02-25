"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import DatePicker from "@/components/ui/DatePicker";
import { documentTypeOptions, documentTypeLabels } from "@/lib/payables/schemas";

type Option = { value: string; label: string };

type Props = {
  condominiumId: string;
  suppliers: (Option & { expenseItemId?: string | null })[];
  expenseItems: Option[];
  payableId?: string;
  defaults?: {
    supplier_id?: string | null;
    expense_item_id?: string | null;
    document_type?: string | null;
    issue_date?: string | null;
    due_date?: string | null;
    invoice_number?: string | null;
    total_amount?: number | null;
    description?: string | null;
    planned_payment_method?: string | null;
    planned_reference?: string | null;
  };
};

export default function RegisterPayableForm({ condominiumId, suppliers, expenseItems, payableId, defaults }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [supplierId, setSupplierId] = useState<string>(defaults?.supplier_id || "");
  const [expenseItemId, setExpenseItemId] = useState<string>(defaults?.expense_item_id || "");
  const [documentType, setDocumentType] = useState<string>(defaults?.document_type || "factura");
  const [issueDate, setIssueDate] = useState<string>(defaults?.issue_date || "");
  const [dueDate, setDueDate] = useState<string>(defaults?.due_date || "");
  const [invoiceNumber, setInvoiceNumber] = useState<string>(defaults?.invoice_number || "");
  const [amount, setAmount] = useState<number>(Number(defaults?.total_amount || 0));
  const [description, setDescription] = useState<string>(defaults?.description || "");
  const [file, setFile] = useState<File | null>(null);
  const [plannedMethod, setPlannedMethod] = useState<string>(defaults?.planned_payment_method || "");
  const [plannedRef, setPlannedRef] = useState<string>(defaults?.planned_reference || "");

  const suggestedExpense = useMemo(() => {
    const sup = suppliers.find((s) => s.value === supplierId);
    return sup?.expenseItemId || "";
  }, [supplierId, suppliers]);

  // Etiqueta dinámica para el número de documento
  const documentNumberLabel = useMemo(() => {
    switch (documentType) {
      case "factura": return "Número de factura";
      case "nota_de_venta": return "Número de nota de venta";
      case "recibo": return "Número de recibo";
      case "liquidacion": return "Número de liquidación";
      default: return "Número de documento";
    }
  }, [documentType]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (file && file.type !== "application/pdf") {
      setMessage({ type: "error", text: "Solo se permite PDF en el documento." });
      return;
    }
    if (!expenseItemId && !suggestedExpense) {
      setMessage({ type: "error", text: "Selecciona un rubro." });
      return;
    }
    if (!issueDate || !dueDate) {
      setMessage({ type: "error", text: "Selecciona fechas de emisión y vencimiento." });
      return;
    }
    if (amount <= 0) {
      setMessage({ type: "error", text: "El monto debe ser mayor a 0." });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const payload = {
        condominiumId,
        general: {
          supplier_id: supplierId,
          expense_item_id: expenseItemId || suggestedExpense,
          document_type: documentType,
          issue_date: issueDate,
          due_date: dueDate,
          total_amount: amount,
          invoice_number: invoiceNumber,
          description: description || undefined,
          planned_payment_method: plannedMethod || undefined,
          planned_reference: plannedRef || undefined,
        },
      };
      const form = new FormData();
      form.append("payload", JSON.stringify(payload));
      if (file) form.append("invoice", file);

      const endpoint = payableId ? `/api/payables/${payableId}/update` : "/api/payables/register";
      const res = await fetch(endpoint, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data?.error) {
        setMessage({ type: "error", text: data?.error || "No se pudo guardar." });
        return;
      }
      setMessage({ type: "success", text: payableId ? "Guardado correctamente." : "Cuenta por pagar creada." });
      setTimeout(() => router.push(`/app/${condominiumId}/payables`), 500);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {payableId ? "Editar cuenta por pagar" : "Nueva cuenta por pagar"}
          </h3>
          <p className="text-sm text-gray-500">Registra una factura, nota de venta o recibo pendiente de pago.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Proveedor */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Proveedor <span className="text-rose-500">*</span></label>
          <select
            required
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              if (!expenseItemId && suggestedExpense) setExpenseItemId(suggestedExpense);
            }}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          >
            <option value="">Selecciona proveedor</option>
            {suppliers.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Rubro */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Rubro <span className="text-rose-500">*</span></label>
          <select
            required
            value={expenseItemId || suggestedExpense}
            onChange={(e) => setExpenseItemId(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          >
            <option value="">Selecciona rubro</option>
            {expenseItems.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de documento */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Tipo de documento <span className="text-rose-500">*</span></label>
          <select
            required
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          >
            {documentTypeOptions.map((type) => (
              <option key={type} value={type}>
                {documentTypeLabels[type]}
              </option>
            ))}
          </select>
        </div>

        {/* Número de documento */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">{documentNumberLabel} <span className="text-rose-500">*</span></label>
          <input
            required
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
            placeholder="Ej. 001-001-000123"
          />
        </div>

        {/* Fecha de emisión */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Fecha de emisión <span className="text-rose-500">*</span></label>
          <DatePicker required value={issueDate} onChange={setIssueDate} />
        </div>

        {/* Fecha de vencimiento */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Fecha de vencimiento <span className="text-rose-500">*</span></label>
          <DatePicker required value={dueDate} onChange={setDueDate} />
        </div>

        {/* Monto */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Monto total <span className="text-rose-500">*</span></label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          />
          <p className="text-[11px] text-gray-500">Total: {formatCurrency(amount || 0)}</p>
        </div>

        {/* Forma de pago prevista */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Forma de pago prevista</label>
          <select
            value={plannedMethod}
            onChange={(e) => setPlannedMethod(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          >
            <option value="">Sin definir</option>
            <option value="cheque">Cheque</option>
            <option value="transferencia">Transferencia</option>
            <option value="efectivo">Efectivo</option>
          </select>
        </div>

        {/* Referencia prevista (solo para cheque/transferencia) */}
        {(plannedMethod === "cheque" || plannedMethod === "transferencia") && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">
              {plannedMethod === "cheque" ? "Número de cheque (previsto)" : "Número de orden (previsto)"}
            </label>
            <input
              value={plannedRef}
              onChange={(e) => setPlannedRef(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
              placeholder={plannedMethod === "cheque" ? "Ej. 001234" : "Ej. 00012345"}
            />
          </div>
        )}
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700">Detalle / justificación <span className="text-rose-500">*</span></label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          placeholder="Describe el gasto o servicio"
          required
        />
      </div>

      {/* Archivo PDF */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700">Documento PDF (opcional)</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-white hover:file:bg-brand-dark"
        />
      </div>

      {message && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            message.type === "error"
              ? "bg-rose-50 text-rose-700 border border-rose-100"
              : "bg-emerald-50 text-emerald-700 border border-emerald-100"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

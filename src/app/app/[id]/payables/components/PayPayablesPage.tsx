"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DatePicker from "@/components/ui/DatePicker";
import { formatCurrency } from "@/lib/utils";

type Option = { value: string; label: string };

type Payable = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance: number | null;
  status: string;
  expense_item?: { name?: string | null } | null;
  description?: string | null;
};

type Props = {
  condominiumId: string;
  suppliers: Option[];
  accounts: Option[];
};

export default function PayPayablesPage({ condominiumId, suppliers, accounts }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supplierPreset = searchParams.get("supplierId") || "";

  const [isPending, startTransition] = useTransition();
  const [supplierId, setSupplierId] = useState<string>(supplierPreset);
  const [accountId, setAccountId] = useState<string>("");
  const [method, setMethod] = useState<string>("transferencia");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [payables, setPayables] = useState<Payable[]>([]);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [proof, setProof] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (supplierId) fetchPayables(supplierId);
    else {
      setPayables([]);
      setAmounts({});
    }
  }, [supplierId]);

  const fetchPayables = async (supId: string) => {
    const { data, error } = await supabase
      .from("payable_orders")
      .select(
        `
        id,
        invoice_number,
        issue_date,
        due_date,
        total_amount,
        paid_amount,
        balance,
        status,
        description,
        expense_item:expense_items(name)
      `
      )
      .eq("condominium_id", condominiumId)
      .eq("supplier_id", supId)
      .neq("status", "anulado")
      .neq("status", "pagado")
      .order("due_date", { ascending: true });
    if (error) {
      setMessage({ type: "error", text: "No se pudieron cargar las OP." });
      return;
    }
    const mapped =
      (data || []).map((p: any) => ({
        ...p,
        balance: p.balance ?? Number(p.total_amount || 0) - Number(p.paid_amount || 0),
      })) || [];
    setPayables(mapped);
    const defaultAmounts: Record<string, number> = {};
    mapped.forEach((p) => (defaultAmounts[p.id] = Number(p.balance || 0)));
    setAmounts(defaultAmounts);
  };

  const total = useMemo(
    () => Object.entries(amounts).reduce((acc, [id, val]) => acc + (payables.find((p) => p.id === id) ? Number(val || 0) : 0), 0),
    [amounts, payables]
  );

  const handleSubmit = () => {
    if (!supplierId) return setMessage({ type: "error", text: "Selecciona un proveedor." });
    if (!accountId) return setMessage({ type: "error", text: "Selecciona una cuenta bancaria." });
    if (!paymentDate) return setMessage({ type: "error", text: "Selecciona la fecha de pago." });
    if (proof && proof.type !== "application/pdf")
      return setMessage({ type: "error", text: "El comprobante debe ser PDF." });
    const selected = payables
      .map((p) => ({ id: p.id, amount: Number(amounts[p.id] || 0) }))
      .filter((p) => p.amount > 0);
    if (!selected.length) return setMessage({ type: "error", text: "Debes pagar al menos una OP." });
    setMessage(null);
    startTransition(async () => {
      const payload = {
        condominium_id: condominiumId,
        supplier_id: supplierId,
        financial_account_id: accountId,
        payment_method: method,
        payment_date: paymentDate,
        reference_number: reference || undefined,
        notes: notes || undefined,
        payables: selected.map((p) => ({ payable_order_id: p.id, amount: p.amount })),
      };
      const form = new FormData();
      form.append("payload", JSON.stringify(payload));
      if (proof) form.append("proof", proof);

      const res = await fetch("/api/payables/pay", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data?.error) {
        setMessage({ type: "error", text: data?.error || "No se pudo registrar el pago." });
        return;
      }
      setMessage({ type: "success", text: "Pago registrado con éxito." });
      setTimeout(() => router.push(`/app/${condominiumId}/payables`), 600);
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase font-semibold text-gray-500">Pago de OP</p>
          <h3 className="text-xl font-semibold text-gray-900">Egreso / cheque / transferencia</h3>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Proveedor</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
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
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Cuenta bancaria</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          >
            <option value="">Selecciona cuenta</option>
            {accounts.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Método</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
          >
            <option value="transferencia">Transferencia</option>
            <option value="cheque">Cheque</option>
            <option value="efectivo">Efectivo</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Fecha de pago</label>
          <DatePicker required value={paymentDate} onChange={setPaymentDate} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Cheque / transferencia</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
            placeholder="Número de cheque o ref."
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Notas</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
            placeholder="Notas internas"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">OP del proveedor</h4>
          <span className="text-xs font-semibold text-gray-600">
            Total a pagar: {formatCurrency(total)}
          </span>
        </div>
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase text-gray-600 tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Factura</th>
                <th className="px-4 py-3 text-left">Rubro</th>
                <th className="px-4 py-3 text-left">Detalle</th>
                <th className="px-4 py-3 text-left">Emisión</th>
                <th className="px-4 py-3 text-left">Vence</th>
                <th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3 text-right">Pagar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payables.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800">{p.invoice_number}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{p.expense_item?.name || "--"}</td>
                  <td className="px-4 py-3 text-xs text-gray-700 max-w-[220px] truncate">{p.description || "--"}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{p.issue_date}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{p.due_date}</td>
                  <td className="px-4 py-3 text-xs text-right font-semibold text-gray-900">
                    {formatCurrency(p.balance ?? p.total_amount - (p.paid_amount || 0))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amounts[p.id] ?? p.balance ?? 0}
                      onChange={(e) =>
                        setAmounts((prev) => ({
                          ...prev,
                          [p.id]: Number(e.target.value),
                        }))
                      }
                      className="w-28 rounded-md border border-gray-200 px-2 py-1 text-xs shadow-sm focus:border-brand focus:ring-brand/20"
                    />
                  </td>
                </tr>
              ))}
              {!payables.length && (
                <tr>
                  <td className="px-4 py-4 text-center text-gray-500 text-sm" colSpan={6}>
                    No hay OP pendientes para este proveedor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700">Comprobante PDF (opcional)</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setProof(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-white hover:file:bg-brand-dark"
        />
      </div>

      {message && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            message.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
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
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
          className="rounded-md bg-brand text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-brand-dark disabled:opacity-60"
        >
          Registrar pago
        </button>
      </div>
    </div>
  );
}

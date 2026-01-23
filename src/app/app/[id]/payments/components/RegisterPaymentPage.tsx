"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DatePicker from "@/components/ui/DatePicker";
import { paymentMethodOptions } from "@/lib/payments/schemas";
import { formatCurrency } from "@/lib/utils";

type Option = { value: string; label: string };

type ChargeRow = {
  id: string;
  period: string | null;
  description?: string | null;
  due_date?: string | null;
  balance: number;
  expense_item?: { name?: string | null } | null;
  include: boolean;
  amountToApply: number;
};

type Contact = {
  name?: string | null;
  identification?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type Props = {
  condominiumId: string;
  units: Option[];
  accounts: Option[];
};

const normalizeDetail = (description?: string | null, expenseName?: string | null) => {
  const base = description?.trim() || expenseName?.trim();
  if (!base) return "";
  const parts = base.split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && parts.every((p) => p.toLowerCase() === parts[0].toLowerCase())) {
    return parts[0];
  }
  return base;
};

export default function RegisterPaymentPage({ condominiumId, units, accounts }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const supabase = createClient();

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [unitId, setUnitId] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [discountEnabled, setDiscountEnabled] = useState<boolean>(false);
  const [discountDetail, setDiscountDetail] = useState<string>("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);
  const [nextFolio, setNextFolio] = useState<string>("--");

  // Subtotal solicitado (puede incluir sobrepago, quedará como crédito).
  const requestedSubtotal = useMemo(
    () =>
      charges
        .filter((c) => c.include)
        .reduce((acc, c) => acc + Number(c.amountToApply || 0), 0),
    [charges]
  );
  // Subtotal aplicable (limitado por saldo de cada cargo).
  const appliedSubtotal = useMemo(
    () =>
      charges
        .filter((c) => c.include)
        .reduce((acc, c) => acc + Math.min(Number(c.amountToApply || 0), Number(c.balance || 0)), 0),
    [charges]
  );
  const totalToCharge = Math.max(Number((requestedSubtotal - Number(discount || 0)).toFixed(2)), 0);

  useEffect(() => {
    fetchNextFolio();
    if (unitId) {
      loadCharges(unitId);
      loadContact(unitId);
    } else {
      setCharges([]);
      setContact(null);
    }
  }, [unitId]);

  const fetchNextFolio = async () => {
    const { data, error } = await supabase
      .from("folio_counters")
      .select("current_folio_rec")
      .eq("condominium_id", condominiumId)
      .maybeSingle();
    if (!error && data?.current_folio_rec !== undefined && data?.current_folio_rec !== null) {
      const next = Number(data.current_folio_rec) + 1;
      setNextFolio(next.toString().padStart(4, "0"));
    }
  };

  const loadCharges = async (uId: string) => {
    setLoadingCharges(true);
    const { data, error } = await supabase
      .from("charges")
      .select(
        `
        id,
        period,
        description,
        due_date,
        balance,
        expense_item:expense_items(name)
      `
      )
      .eq("unit_id", uId)
      .eq("condominium_id", condominiumId)
      .eq("status", "pendiente")
      .order("due_date", { ascending: true });
    if (error) {
      setMessage({ type: "error", text: "No se pudieron cargar los cargos." });
      setLoadingCharges(false);
      return;
    }
    const mapped =
      (data || [])
        .sort((a: any, b: any) => (a.due_date || "").localeCompare(b.due_date || ""))
        .map((c: any) => ({
          id: c.id,
          period: c.period,
          description: c.description,
          due_date: c.due_date,
          balance: Number(c.balance || 0),
          expense_item: c.expense_item,
          include: true,
          amountToApply: Number(c.balance || 0),
        })) || [];
    setCharges(mapped);
    setLoadingCharges(false);
  };

  const loadContact = async (uId: string) => {
    const { data } = await supabase
      .from("unit_contacts")
      .select(
        `
        unit_id,
        is_primary_contact,
        end_date,
        profiles(
          full_name,
          national_id,
          email,
          phone,
          address
        )
      `
      )
      .eq("unit_id", uId)
      .eq("is_primary_contact", true)
      .is("end_date", null)
      .maybeSingle();
    if (data?.profiles) {
      setContact({
        name: data.profiles.full_name,
        identification: data.profiles.national_id,
        email: data.profiles.email,
        phone: data.profiles.phone,
        address: data.profiles.address,
      });
    } else {
      setContact(null);
    }
  };

  const toggleCharge = (id: string) => {
    setCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, include: !c.include, amountToApply: !c.include ? c.balance : 0 } : c))
    );
  };

  const updateAmount = (id: string, value: number) => {
    setCharges((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const val = Math.max(0, value);
        return { ...c, amountToApply: Number(val.toFixed(2)), include: val > 0 };
      })
    );
  };

  const autoAsignar = () => {
    const totalSeleccionado = charges.filter((c) => c.include).reduce((acc, c) => acc + c.balance, 0);
    let restante = Number(totalSeleccionado) || 0;
    setCharges((prev) =>
      prev.map((c) => {
        if (restante <= 0) return { ...c, include: false, amountToApply: 0 };
        const aplicar = Math.min(restante, c.balance);
        restante -= aplicar;
        return { ...c, include: aplicar > 0, amountToApply: Number(aplicar.toFixed(2)) };
      })
    );
  };

  const submit = () => {
    if (!accountId) {
      setMessage({ type: "error", text: "Selecciona la cuenta de ingreso." });
      return;
    }
    if (!unitId) {
      setMessage({ type: "error", text: "Selecciona la unidad." });
      return;
    }
    if (!paymentMethod) {
      setMessage({ type: "error", text: "Selecciona el método de pago." });
      return;
    }
    if (!paymentDate) {
      setMessage({ type: "error", text: "Selecciona la fecha de pago." });
      return;
    }
    if (Number(totalToCharge) <= 0) {
      setMessage({ type: "error", text: "Ingresa el monto a cobrar." });
      return;
    }
    if (!reference.trim()) {
      setMessage({ type: "error", text: "El número de referencia es obligatorio." });
      return;
    }
    const allocations = charges
      .filter((c) => c.include && Number(c.amountToApply || 0) > 0)
      .map((c) => {
        const toApply = Math.min(Number(c.amountToApply || 0), Number(c.balance || 0));
        return {
          charge_id: c.id,
          amount_allocated: Number(toApply.toFixed(2)),
          charge_balance: Number(c.balance || 0),
        };
      })
      .filter((c) => c.amount_allocated > 0);
    if (allocations.length === 0) {
      setMessage({ type: "error", text: "Selecciona al menos un cargo a pagar." });
      return;
    }
    if (discountEnabled) {
      if (!discountDetail.trim()) {
        setMessage({ type: "error", text: "Agrega el detalle del descuento." });
        return;
      }
      if (Number(discount) < 0) {
        setMessage({ type: "error", text: "El descuento no puede ser negativo." });
        return;
      }
      if (discount > appliedSubtotal) {
        setMessage({ type: "error", text: "El descuento supera el subtotal seleccionado." });
        return;
      }
    } else {
      // forzar descuento cero si no está habilitado
      setDiscount(0);
    }

    setMessage(null);
    startTransition(async () => {
      const payload = {
        condominiumId,
        general: {
          condominium_id: condominiumId,
          financial_account_id: accountId,
          payment_date: paymentDate,
          total_amount: totalToCharge,
          payment_method: paymentMethod,
          reference_number: reference,
          notes,
        },
        apply: {
          unit_id: unitId,
          allocations,
          allow_unassigned: true,
        },
        direct: null,
      };

      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      if (attachmentFile) {
        formData.append("attachment", attachmentFile);
      }

      const res = await fetch("/api/payments/register", {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        setMessage({ type: "error", text: json.error || "No se pudo registrar el pago." });
        return;
      }

      setMessage({ type: "success", text: "Pago registrado." });
      setTimeout(() => {
        router.push(`/app/${condominiumId}/payments`);
      }, 800);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Registrar cobro</h1>
          <p className="text-sm text-gray-600">Selecciona unidad, marca deudas y cobra en una sola pantalla.</p>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="bg-brand text-white px-5 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Registrar pago"}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-end">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-200">
            Recibo: {nextFolio}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Unidad *</label>
            <select
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              <option value="">Selecciona</option>
              {units.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Cuenta / Banco *</label>
            <select
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">Selecciona</option>
              {accounts.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Fecha de pago *</label>
            <DatePicker value={paymentDate} onChange={setPaymentDate} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Método *</label>
            <select
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="">Selecciona</option>
              {paymentMethodOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Número de referencia *</label>
            <input
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transferencia, depósito, cheque"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Notas</label>
            <input
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones internas"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Comprobante (imagen)</label>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm text-gray-700"
              onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
            />
            <p className="text-[11px] text-gray-500 mt-1">Opcional: captura o foto del pago. Se guardará en el recibo.</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Cargos pendientes de la unidad</h3>
            <p className="text-xs text-gray-600">Selecciona cuáles pagar y edita montos si es pago parcial.</p>
          </div>
        </div>

        <div className="overflow-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-center">Pagar</th>
                <th className="px-3 py-2 text-left">Rubro</th>
                <th className="px-3 py-2 text-left">Detalle</th>
                <th className="px-3 py-2 text-left">Periodo</th>
                <th className="px-3 py-2 text-left">Vence</th>
                <th className="px-3 py-2 text-right">Saldo</th>
                <th className="px-3 py-2 text-right">Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {charges.map((c) => {
                const detail = normalizeDetail(c.description, c.expense_item?.name);
                return (
                  <tr key={c.id}>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={c.include}
                        onChange={() => toggleCharge(c.id)}
                        className="rounded text-brand focus:ring-brand"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">{c.expense_item?.name || "--"}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{detail}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{c.period || "--"}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{c.due_date || "--"}</td>
                    <td className="px-3 py-2 text-xs text-right text-gray-700 font-semibold">
                      {formatCurrency(c.balance)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-28 border border-gray-200 rounded-md px-2 py-1 text-sm text-right"
                        value={c.amountToApply.toFixed(2)}
                        onChange={(e) => updateAmount(c.id, Number(parseFloat(e.target.value || "0").toFixed(2)))}
                        onBlur={(e) => updateAmount(c.id, Number(parseFloat(e.target.value || "0").toFixed(2)))}
                        disabled={!c.include}
                      />
                    </td>
                  </tr>
                );
              })}
              {!charges.length && (
                <tr>
                  <td className="px-4 py-4 text-center text-sm text-gray-500" colSpan={7}>
                    {loadingCharges ? "Cargando cargos..." : "Selecciona una unidad para ver cargos pendientes."}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-3 py-2" />
                <td className="px-3 py-2" />
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right font-semibold text-gray-800" colSpan={2}>
                  Subtotal seleccionado
                </td>
                <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatCurrency(requestedSubtotal)}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-800">
                  Total a cobrar: {formatCurrency(totalToCharge)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm md:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Representante / Residente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">A nombre de</label>
              <input
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50"
                value={contact?.name || ""}
                readOnly
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Identificación</label>
              <input
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50"
                value={contact?.identification || ""}
                readOnly
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Celular</label>
              <input
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50"
                value={contact?.phone || ""}
                readOnly
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Correo electrónico</label>
              <input
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50"
                value={contact?.email || ""}
                readOnly
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-700 block mb-1">Dirección</label>
              <input
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50"
                value={contact?.address || ""}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Totales</h3>
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span>Subtotal seleccionado</span>
            <span className="font-semibold">{formatCurrency(requestedSubtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span className="flex items-center gap-2">
              <span>Descuento</span>
              <button
                type="button"
                onClick={() => {
                  const newVal = !discountEnabled;
                  setDiscountEnabled(newVal);
                  if (!newVal) {
                    setDiscount(0);
                    setDiscountDetail("");
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                  discountEnabled ? "bg-brand border-brand" : "bg-gray-200 border-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
                    discountEnabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </span>
            {discountEnabled ? (
              <div className="flex flex-col items-end gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-28 border border-gray-200 rounded-md px-2 py-1 text-sm text-right"
                  value={discount}
                  onChange={(e) => setDiscount(Number(parseFloat(e.target.value || "0").toFixed(2)))}
                  onBlur={(e) => setDiscount(Number(parseFloat(e.target.value || "0").toFixed(2)))}
                />
                <input
                  type="text"
                  className="w-40 border border-gray-200 rounded-md px-2 py-1 text-sm"
                  value={discountDetail}
                  onChange={(e) => setDiscountDetail(e.target.value)}
                  placeholder="Detalle del descuento"
                />
              </div>
            ) : (
              <span className="text-xs text-gray-500">Desactivado</span>
            )}
          </div>
          <div className="flex items-center justify-between text-sm text-gray-900">
            <span className="font-semibold">TOTAL A COBRAR</span>
            <span className="font-bold text-lg">{formatCurrency(totalToCharge)}</span>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`text-sm font-semibold px-3 py-2 rounded-md ${
            message.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}


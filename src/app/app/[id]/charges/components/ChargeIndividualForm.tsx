"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearCargoIndividual } from "../actions";
import { ChargeType } from "@/types/charges";
import DatePicker from "@/components/ui/DatePicker";

type Option = { value: string; label: string };

type Props = {
  condominiumId: string;
  expenseItems: Option[];
  units: Option[];
  label?: string;
  className?: string;
};

export default function ChargeIndividualForm({ condominiumId, expenseItems, units, label, className }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const hoy = new Date().toISOString().slice(0, 10);
  const [postedDate, setPostedDate] = useState<string>(hoy);
  const [dueDate, setDueDate] = useState<string>(hoy);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const res = await crearCargoIndividual({
        condominium_id: condominiumId,
        unit_id: formData.get("unit_id") as string,
        expense_item_id: formData.get("expense_item_id") as string,
        posted_date: formData.get("posted_date") as string,
        due_date: formData.get("due_date") as string,
        period: formData.get("period") ? `${formData.get("period")}-01` : null,
        total_amount: Number(formData.get("total_amount") || 0),
        description: (formData.get("description") as string) || undefined,
        charge_type: (formData.get("charge_type") as ChargeType) || "otro",
      });
      if (res?.error) setMessage({ type: "error", text: res.error });
      else {
        setMessage({ type: "success", text: "Cargo creado" });
        setTimeout(() => {
          setIsOpen(false);
          formRef.current?.reset();
          setMessage(null);
          router.push(`/app/${condominiumId}/charges?success=individual`);
        }, 700);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          "bg-brand text-white px-3 py-2 rounded-md text-xs font-semibold shadow-sm hover:bg-brand-dark"
        }
      >
        {label || "Crear cargo individual"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl border border-gray-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Nuevo cargo</h3>
                <p className="text-xs text-gray-500">Para multas, reservas u otros ingresos unitarios.</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form ref={formRef} onSubmit={submit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">Unidad *</label>
                  <select name="unit_id" required className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm">
                    <option value="">Selecciona</option>
                    {units.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">Rubro *</label>
                  <select
                    name="expense_item_id"
                    required
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Selecciona</option>
                    {expenseItems.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">Tipo de cargo</label>
                  <select name="charge_type" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm">
                    <option value="multa">Multa</option>
                    <option value="reserva">Reserva</option>
                    <option value="otro">Otro ingreso</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">Periodo (opcional)</label>
                  <input
                    type="month"
                    name="period"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">Fecha emision *</label>
                  <DatePicker value={postedDate} onChange={setPostedDate} />
                  <input type="hidden" name="posted_date" value={postedDate} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">Fecha vencimiento *</label>
                  <DatePicker value={dueDate} onChange={setDueDate} />
                  <input type="hidden" name="due_date" value={dueDate} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">Monto *</label>
                  <input
                    type="number"
                    name="total_amount"
                    step="0.01"
                    min={0}
                    required
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">Descripcion</label>
                  <textarea
                    name="description"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm min-h-[80px]"
                    placeholder="Motivo de la multa, reserva o detalle del cargo"
                  />
                </div>
              </div>

              {message && (
                <div
                  className={`text-xs font-bold p-3 rounded-md text-center ${
                    message.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {message.text}
                </div>
              )}
            </form>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 border border-gray-300 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={() => formRef.current?.requestSubmit()}
                disabled={isPending}
                className="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-md text-xs font-bold shadow-md disabled:opacity-50"
              >
                {isPending ? "Guardando..." : "Crear cargo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

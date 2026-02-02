"use client";

import { useRef, useState, useTransition } from "react";
import { createFinancialAccount, updateFinancialAccount } from "../actions";
import { FinancialAccount } from "@/types/financial";
import { Plus, Pencil } from "lucide-react";

type Props = {
  condominiumId: string;
  account?: FinancialAccount;
  trigger?: "button" | "icon";
};

export default function FinancialAccountForm({ condominiumId, account, trigger = "button" }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isEdit = !!account;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateFinancialAccount(condominiumId, account!.id, formData)
        : await createFinancialAccount(condominiumId, formData);

      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: isEdit ? "Cuenta actualizada" : "Cuenta creada" });
        setTimeout(() => {
          setOpen(false);
          formRef.current?.reset();
          setMessage(null);
        }, 800);
      }
    });
  };

  const defaults = {
    bank_name: account?.bank_name || "",
    account_number: account?.account_number || "",
    account_type: account?.account_type || "corriente",
    initial_balance: account?.initial_balance ?? 0,
    current_balance: account?.current_balance ?? 0,
    is_active: account?.is_active ?? true,
    uses_checks: account?.uses_checks ?? false,
  };

  const Trigger =
    trigger === "icon" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-2 text-gray-400 hover:text-brand hover:bg-purple-50 rounded-lg"
        title="Editar cuenta"
      >
        <Pencil size={16} />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-brand text-white px-3 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark shadow-sm"
      >
        <Plus size={14} />
        {isEdit ? "Editar cuenta" : "Nueva cuenta"}
      </button>
    );

  return (
    <>
      {Trigger}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {isEdit ? "Editar cuenta" : "Crear cuenta financiera"}
                </h3>
                <p className="text-xs text-gray-500">
                  Define si la cuenta usara gestion de cheques (solo corriente).
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form ref={formRef} onSubmit={submit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
                    Nombre de la cuenta *
                  </label>
                  <input
                    name="bank_name"
                    defaultValue={defaults.bank_name}
                    required
                    className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
                    placeholder="Banco X - Cta corriente / Caja chica"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
                    Numero / identificador *
                  </label>
                  <input
                    name="account_number"
                    defaultValue={defaults.account_number}
                    required
                    className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
                    placeholder="000-0000-00 o CAJA-PRINCIPAL"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
                    Tipo de cuenta *
                  </label>
                  <select
                    name="account_type"
                    defaultValue={defaults.account_type}
                    className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
                  >
                    <option value="corriente">Cuenta corriente</option>
                    <option value="ahorros">Cuenta de ahorros</option>
                    <option value="caja_chica">Caja chica</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
                      Saldo inicial *
                    </label>
                    <input
                      name="initial_balance"
                      type="number"
                      step="0.01"
                      defaultValue={defaults.initial_balance}
                      className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
                      Saldo actual
                    </label>
                    <input
                      name="current_balance"
                      type="number"
                      step="0.01"
                      defaultValue={defaults.current_balance}
                      className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-3">
                <label className="flex items-center text-sm text-gray-700 cursor-pointer select-none hover:bg-gray-50 p-2 rounded border border-gray-200">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={defaults.is_active}
                    className="rounded text-brand focus:ring-brand mr-2"
                  />
                  Activa
                </label>

                <label
                  className={`flex items-center text-sm cursor-pointer select-none p-2 rounded border ${
                    defaults.account_type === "corriente"
                      ? "text-gray-700 border-gray-200 hover:bg-gray-50"
                      : "text-gray-400 border-dashed border-gray-200 cursor-not-allowed"
                  }`}
                  title="Solo disponible para cuentas corrientes"
                >
                  <input
                    type="checkbox"
                    name="uses_checks"
                    defaultChecked={defaults.uses_checks}
                    disabled={defaults.account_type !== "corriente"}
                    className="rounded text-brand focus:ring-brand mr-2"
                  />
                  Esta cuenta usa cheques
                </label>
              </div>

              {message && (
                <div
                  className={`text-xs font-bold p-3 rounded-md text-center ${
                    message.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
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
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 border border-gray-300 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={() => formRef.current?.requestSubmit()}
                disabled={isPending}
                className="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-md text-xs font-bold shadow-md disabled:opacity-50"
              >
                {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear cuenta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

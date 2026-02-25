"use client";

import { useRef, useState, useTransition } from "react";
import { createFinancialAccount, updateFinancialAccount } from "../actions";
import { FinancialAccount } from "@/types/financial";
import { Plus, Pencil, Building2, CreditCard, Landmark, Calendar } from "lucide-react";

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
  const [accountType, setAccountType] = useState<"corriente" | "ahorros">(
    account?.account_type === "ahorros" ? "ahorros" : "corriente"
  );

  const isEdit = !!account;
  const isPettyCash = account?.account_type === "caja_chica";

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
        className="flex items-center gap-2 bg-brand text-white px-3 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark shadow-sm transition-colors"
      >
        <Building2 size={14} />
        Nueva Cuenta Bancaria
      </button>
    );

  return (
    <>
      {Trigger}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand/10 rounded-lg">
                    <Landmark className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {isEdit ? (isPettyCash ? "Editar Caja Chica" : "Editar Cuenta") : "Nueva Cuenta Bancaria"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isEdit ? "Modifica los datos de la cuenta" : "Cuenta corriente o de ahorros"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-700 text-2xl leading-none p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  &times;
                </button>
              </div>
            </div>

            <form ref={formRef} onSubmit={submit} className="p-5 space-y-4">
              {/* Nombre del banco */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 uppercase mb-1.5 block">
                  {isPettyCash ? "Nombre de la caja" : "Nombre del banco"} *
                </label>
                <input
                  name="bank_name"
                  defaultValue={defaults.bank_name}
                  required
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20 focus:ring-2 transition-all"
                  placeholder={isPettyCash ? "Caja Chica Principal" : "Banco Pichincha"}
                />
              </div>

              {/* Número de cuenta - Solo para cuentas bancarias */}
              {!isPettyCash && (
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1.5 flex items-center gap-1.5">
                    <CreditCard size={12} className="text-brand" />
                    Número de cuenta *
                  </label>
                  <input
                    name="account_number"
                    defaultValue={defaults.account_number}
                    required
                    className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20 focus:ring-2 transition-all"
                    placeholder="2200012345"
                  />
                </div>
              )}

              {/* Si es edición de caja chica, mostramos el identificador como readonly */}
              {isPettyCash && isEdit && (
                <input type="hidden" name="account_number" value={defaults.account_number} />
              )}

              {/* Tipo de cuenta - Solo para nuevas cuentas bancarias */}
              {!isEdit && !isPettyCash && (
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1.5 block">
                    Tipo de cuenta *
                  </label>
                  <select
                    name="account_type"
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as "corriente" | "ahorros")}
                    className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20 focus:ring-2 transition-all"
                  >
                    <option value="corriente">Cuenta corriente</option>
                    <option value="ahorros">Cuenta de ahorros</option>
                  </select>
                </div>
              )}

              {/* Tipo oculto para edición */}
              {isEdit && <input type="hidden" name="account_type" value={defaults.account_type} />}

              {/* Saldos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1.5 flex items-center gap-1.5">
                    <Calendar size={12} className="text-brand" />
                    Saldo inicial *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      name="initial_balance"
                      type="number"
                      step="0.01"
                      defaultValue={defaults.initial_balance}
                      className="w-full h-10 rounded-lg border border-gray-200 pl-7 pr-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20 focus:ring-2 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Saldo al momento de registrar
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1.5 block">
                    Saldo actual
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      name="current_balance"
                      type="number"
                      step="0.01"
                      defaultValue={defaults.current_balance}
                      className="w-full h-10 rounded-lg border border-gray-200 pl-7 pr-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20 focus:ring-2 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Opciones */}
              <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
                <label className="flex items-center text-sm text-gray-700 cursor-pointer select-none hover:bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 transition-colors">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={defaults.is_active}
                    className="rounded text-brand focus:ring-brand mr-2"
                  />
                  Cuenta activa
                </label>

                {(accountType === "corriente" || defaults.account_type === "corriente") && !isPettyCash && (
                  <label className="flex items-center text-sm text-gray-700 cursor-pointer select-none hover:bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 transition-colors">
                    <input
                      type="checkbox"
                      name="uses_checks"
                      defaultChecked={defaults.uses_checks}
                      className="rounded text-brand focus:ring-brand mr-2"
                    />
                    Usa cheques
                  </label>
                )}
              </div>

              {message && (
                <div
                  className={`text-xs font-bold p-3 rounded-lg text-center ${
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
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => formRef.current?.requestSubmit()}
                disabled={isPending}
                className="bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isPending ? (
                  "Guardando..."
                ) : isEdit ? (
                  "Guardar cambios"
                ) : (
                  <>
                    <Plus size={14} />
                    Crear Cuenta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

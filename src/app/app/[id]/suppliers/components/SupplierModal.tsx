"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createSupplier, updateSupplier } from "../actions";
import { Plus, Pencil } from "lucide-react";

type ExpenseItem = { id: string; name: string };

type Supplier = {
  id: string;
  supplier_type: string;
  fiscal_id: string;
  name: string;
  commercial_name?: string | null;
  email?: string | null;
  phone?: string | null;
  contact_person?: string | null;
  address?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  default_expense_item_id?: string | null;
  is_active: boolean;
};

interface Props {
  condominiumId: string;
  expenseItems: ExpenseItem[];
  supplier?: Supplier;
  trigger?: "button" | "icon";
}

export default function SupplierModal({
  condominiumId,
  expenseItems,
  supplier,
  trigger = "button",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isEdit = !!supplier;

  const closeModal = () => {
    setIsOpen(false);
    setMessage(null);
    formRef.current?.reset();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateSupplier(condominiumId, supplier!.id, formData)
        : await createSupplier(condominiumId, formData);

      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({
          type: "success",
          text: isEdit ? "Proveedor actualizado" : "Proveedor creado",
        });
        setTimeout(() => closeModal(), 1200);
      }
    });
  };

  const defaults = {
    supplier_type: supplier?.supplier_type || "Persona natural",
    fiscal_id: supplier?.fiscal_id || "",
    name: supplier?.name || "",
    commercial_name: supplier?.commercial_name || "",
    email: supplier?.email || "",
    phone: supplier?.phone || "",
    contact_person: supplier?.contact_person || "",
    address: supplier?.address || "",
    bank_name: supplier?.bank_name || "",
    bank_account_number: supplier?.bank_account_number || "",
    default_expense_item_id: supplier?.default_expense_item_id || "",
    is_active: supplier?.is_active ?? true,
  };

  const [showRubroWarning, setShowRubroWarning] = useState(!defaults.default_expense_item_id);
  useEffect(() => {
    setShowRubroWarning(!defaults.default_expense_item_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const labelClass = "block text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1";
  const inputClass =
    "block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-brand focus:ring-brand/20 h-9 px-3 transition-all bg-white placeholder:text-gray-400";
  const selectClass =
    "block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-brand focus:ring-brand/20 h-9 px-3 bg-white";

  const TriggerButton =
    trigger === "icon" ? (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-400 hover:text-brand hover:bg-purple-50 rounded-lg transition-colors"
        title="Editar proveedor"
      >
        <Pencil size={16} />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded-md transition-all shadow-sm hover:shadow-md font-medium text-xs h-[30px] sm:h-auto"
      >
        <Plus size={14} />
        <span className="hidden sm:inline">{isEdit ? "Editar proveedor" : "Nuevo proveedor"}</span>
        <span className="sm:hidden">{isEdit ? "Editar" : "Nuevo"}</span>
      </button>
    );

  return (
    <>
      {TriggerButton}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {isEdit ? "Editar proveedor" : "Crear proveedor"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Completa los datos del proveedor. Los campos marcados son obligatorios.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                {/* Bloque A - Identificacion */}
                <div className="bg-blue-50/60 p-5 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 mb-4 border-b border-blue-100 pb-2">
                    <span className="text-xs font-bold text-blue-700 uppercase">Datos de identificacion</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Tipo de proveedor *</label>
                      <select
                        name="supplier_type"
                        required
                        defaultValue={defaults.supplier_type}
                        className={`${selectClass} border-blue-200 focus:border-blue-400`}
                      >
                        <option value="Persona natural">Persona natural</option>
                        <option value="Persona juridica">Persona juridica</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Numero de identificacion *</label>
                      <input
                        name="fiscal_id"
                        required
                        defaultValue={defaults.fiscal_id}
                        className={`${inputClass} border-blue-200 focus:border-blue-400`}
                        placeholder="RUC / Cedula / Pasaporte"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Tipo de identificacion (solo UI)</label>
                      <select
                        name="id_type_ui"
                        className={selectClass}
                        defaultValue="CEDULA"
                      >
                        <option value="CEDULA">Cedula</option>
                        <option value="RUC">RUC</option>
                        <option value="PASAPORTE">Pasaporte</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className={labelClass}>Nombre legal *</label>
                      <input
                        name="name"
                        required
                        defaultValue={defaults.name}
                        className={`${inputClass} border-blue-200 focus:border-blue-400`}
                        placeholder="Razon social o nombre completo"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Nombre comercial</label>
                      <input
                        name="commercial_name"
                        defaultValue={defaults.commercial_name}
                        className={inputClass}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloque B - Contacto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Persona de contacto *</label>
                    <input
                      name="contact_person"
                      required
                      defaultValue={defaults.contact_person}
                      className={inputClass}
                      placeholder="Nombre del contacto"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={defaults.email}
                      className={inputClass}
                      placeholder="correo@proveedor.com"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Telefono</label>
                    <input
                      name="phone"
                      defaultValue={defaults.phone}
                      className={inputClass}
                      placeholder="099..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Direccion</label>
                    <input
                      name="address"
                      defaultValue={defaults.address}
                      className={inputClass}
                      placeholder="Direccion o referencia"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 md:col-span-2">
                    Nombre de contacto obligatorio. Ingresa email o telefono (solo uno) para el contacto.
                  </p>
                </div>

                {/* Bloque C - Datos bancarios */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Banco</label>
                    <input
                      name="bank_name"
                      defaultValue={defaults.bank_name}
                      className={inputClass}
                      placeholder="Nombre del banco"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Numero de cuenta</label>
                    <input
                      name="bank_account_number"
                      defaultValue={defaults.bank_account_number}
                      className={inputClass}
                      placeholder="Cuenta bancaria"
                      onChange={() => setShowRubroWarning(showRubroWarning)}
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Si ingresas cuenta, se recomienda indicar tambien el banco.
                    </p>
                  </div>
                </div>

                {/* Bloque D - Rubro principal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    <label className={labelClass}>Rubro principal (recomendado)</label>
                    <select
                      name="default_expense_item_id"
                      defaultValue={defaults.default_expense_item_id}
                      className={selectClass}
                      onChange={(e) => setShowRubroWarning(!e.target.value)}
                    >
                      <option value="">Sin rubro</option>
                      {expenseItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {showRubroWarning && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                      Recomendado asignar un rubro para facilitar cuentas por pagar.
                    </div>
                  )}
                </div>

                {/* Bloque E - Estado */}
                <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-3">
                  <label className="flex items-center text-sm text-gray-700 cursor-pointer select-none hover:bg-gray-50 p-2 rounded border border-gray-200">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={defaults.is_active}
                      className="rounded text-brand focus:ring-brand mr-2"
                    />
                    Activo
                  </label>
                  <span className="text-xs text-gray-500">
                    Un proveedor inactivo no aparece para nuevas ordenes de pago, pero queda en historial.
                  </span>
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
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => formRef.current?.requestSubmit()}
                disabled={isPending}
                className="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-md text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear proveedor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

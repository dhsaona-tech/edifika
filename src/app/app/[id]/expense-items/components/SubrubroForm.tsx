"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { FolderPlus, Pencil } from "lucide-react";
import { CategoriaRubro, Rubro } from "@/types/expense-items";
import { actualizarSubrubro, crearSubrubro } from "../actions";

type Props = {
  condominiumId: string;
  categoria: CategoriaRubro;
  padresDisponibles: Rubro[];
  subrubro?: Rubro;
  parentPresetId?: string;
  trigger?: "button" | "icon";
};

export default function SubrubroForm({
  condominiumId,
  categoria,
  padresDisponibles,
  subrubro,
  parentPresetId,
  trigger = "button",
}: Props) {
  const resolverPadreInicial = () =>
    subrubro?.parent_id ||
    parentPresetId ||
    padresDisponibles.find((p) => p.is_active)?.id ||
    padresDisponibles[0]?.id ||
    "";

  const [open, setOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<string>(resolverPadreInicial);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isEdit = !!subrubro;
  const defaults = {
    name: subrubro?.name || "",
    description: subrubro?.description || "",
    is_active: subrubro?.is_active ?? true,
  };
  const abrir = () => {
    setSelectedParent(resolverPadreInicial());
    setOpen(true);
  };

  const selectedParentObj = useMemo(
    () => padresDisponibles.find((p) => p.id === selectedParent),
    [padresDisponibles, selectedParent]
  );

  const labelClass = "text-[11px] font-bold text-gray-600 uppercase mb-1 block";
  const inputClass =
    "w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20";
  const selectClass =
    "w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20";

  const close = () => {
    setOpen(false);
    setMessage(null);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedParent) {
      setMessage({ type: "error", text: "Selecciona un rubro padre para el subrubro." });
      return;
    }
    const fd = new FormData(e.currentTarget);
    setMessage(null);

    startTransition(async () => {
      const result = isEdit
        ? await actualizarSubrubro(condominiumId, subrubro!.id, fd)
        : await crearSubrubro(condominiumId, fd);

      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: isEdit ? "Subrubro actualizado" : "Subrubro creado" });
        setTimeout(() => {
          setMessage(null);
          setOpen(false);
          formRef.current?.reset();
        }, 900);
      }
    });
  };

  const Trigger =
    trigger === "icon" ? (
      <button
        type="button"
        onClick={abrir}
        className="p-2 text-gray-400 hover:text-brand hover:bg-purple-50 rounded-lg"
        title="Editar subrubro"
      >
        <Pencil size={16} />
      </button>
    ) : (
      <button
        type="button"
        onClick={abrir}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-brand/40 text-brand hover:bg-brand/5 transition"
      >
        <FolderPlus size={14} />
        {isEdit ? "Editar subrubro" : "Agregar subrubro"}
      </button>
    );

  return (
    <>
      {Trigger}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {isEdit ? "Editar subrubro" : "Nuevo subrubro"}
                </h3>
                <p className="text-xs text-gray-500">
                  El subrubro hereda categoria y clasificacion del padre; no tiene presupuesto propio.
                </p>
              </div>
              <button onClick={close} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">
                &times;
              </button>
            </div>

            <form ref={formRef} onSubmit={onSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Rubro padre *</label>
                  <select
                    name="parent_id"
                    value={selectedParent}
                    onChange={(e) => setSelectedParent(e.target.value)}
                    className={selectClass}
                  >
                    {padresDisponibles.map((padre) => (
                      <option key={padre.id} value={padre.id} disabled={!padre.is_active}>
                        {padre.name} {padre.is_active ? "" : "(inactivo)"}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Solo se listan rubros padre del condominio. Inactivos se muestran como lectura por si necesitas
                    mover el subrubro antes de reactivarlos.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-gray-600 uppercase block">Categoria y clasificacion</span>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      {selectedParentObj?.category === "ingreso" || categoria === "ingreso" ? "Ingreso" : "Gasto"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      {selectedParentObj?.classification || subrubro?.classification || "Ordinario/Extra"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Se calcula a partir del rubro padre para mantener consistencia en egresos/ingresos.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Nombre *</label>
                  <input
                    name="name"
                    defaultValue={defaults.name}
                    required
                    className={inputClass}
                    placeholder="Ej. Guardia nocturno, Lavado de cisterna"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Descripcion</label>
                  <textarea
                    name="description"
                    defaultValue={defaults.description}
                    className={`${inputClass} min-h-[70px]`}
                    placeholder="Detalle opcional"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-gray-100 pt-3">
                <label className="flex items-center text-sm text-gray-700 cursor-pointer select-none hover:bg-gray-50 p-2 rounded border border-gray-200">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={defaults.is_active}
                    className="rounded text-brand focus:ring-brand mr-2"
                  />
                  Activo
                </label>
                <span className="text-[11px] text-gray-500">
                  Los subrubros solo clasifican movimientos; no participan en presupuesto por si mismos.
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

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 border border-gray-300 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={() => formRef.current?.requestSubmit()}
                disabled={isPending || !selectedParent}
                className="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-md text-xs font-bold shadow-md disabled:opacity-50"
              >
                {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear subrubro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

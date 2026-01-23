"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { crearRubroPadre, actualizarRubroPadre } from "../actions";
import { CategoriaRubro, Rubro } from "@/types/expense-items";

type Props = {
  condominiumId: string;
  rubro?: Rubro;
  categoriaForzada?: CategoriaRubro;
  trigger?: "button" | "icon";
};

export default function RubroPadreForm({
  condominiumId,
  rubro,
  categoriaForzada,
  trigger = "button",
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isEdit = !!rubro;
  const defaultCategory: CategoriaRubro = (rubro?.category || categoriaForzada || "gasto") as CategoriaRubro;
  const defaultClassification = (rubro?.classification || "ordinario") as "ordinario" | "extraordinario";
  const defaultCategoryValue = (defaultCategory || "gasto").toString().toLowerCase();
  const defaultClassificationValue = (defaultClassification || "ordinario").toString().toLowerCase();

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
    const fd = new FormData(e.currentTarget);
    setMessage(null);

    startTransition(async () => {
      const result = isEdit
        ? await actualizarRubroPadre(condominiumId, rubro!.id, fd)
        : await crearRubroPadre(condominiumId, fd);

      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: isEdit ? "Rubro actualizado" : "Rubro creado" });
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
        onClick={() => setOpen(true)}
        className="p-2 text-gray-400 hover:text-brand hover:bg-purple-50 rounded-lg"
        title="Editar rubro"
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
        {isEdit
          ? "Editar rubro"
          : categoriaForzada === "ingreso"
          ? "Crear rubro de ingreso"
          : "Crear rubro de gasto"}
      </button>
    );

  const classificationOptions =
    defaultCategory === "gasto"
      ? [
          { value: "ordinario", label: "Ordinario (presupuesto anual / egresos base)" },
          { value: "extraordinario", label: "Extraordinario (fuera del presupuesto ordinario)" },
        ]
      : [
          { value: "ordinario", label: "Ordinario (ingreso recurrente)" },
          { value: "extraordinario", label: "Extraordinario (ingreso puntual)" },
        ];

  return (
    <>
      {Trigger}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {isEdit ? "Editar rubro padre" : "Crear rubro padre"}
                </h3>
                <p className="text-xs text-gray-500">
                  Los rubros padre definen categoria y clasificacion; los subrubros heredan estos valores.
                </p>
              </div>
              <button onClick={close} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">
                &times;
              </button>
            </div>

            <form ref={formRef} onSubmit={onSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Nombre del rubro *</label>
                  <input
                    name="name"
                    defaultValue={rubro?.name || ""}
                    required
                    className={inputClass}
                    placeholder="Ej. Limpieza, Seguridad, Expensas mensuales"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Descripcion</label>
                  <textarea
                    name="description"
                    defaultValue={rubro?.description || ""}
                    className={`${inputClass} min-h-[80px]`}
                    placeholder="Detalle opcional"
                  />
                </div>

                <div>
                  <label className={labelClass}>Categoria *</label>
                  <select
                    name="category"
                    defaultValue={defaultCategoryValue}
                    className={selectClass}
                    disabled={!!rubro || !!categoriaForzada}
                  >
                    <option value="gasto">Gasto</option>
                    <option value="ingreso">Ingreso</option>
                  </select>
                  {rubro && (
                    <p className="text-[11px] text-gray-500 mt-1">
                      Categoria fijada. En una etapa posterior se restringira cambiarla si el rubro ya tiene uso.
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Clasificacion *</label>
                  <select
                    name="classification"
                    defaultValue={defaultClassificationValue}
                    className={selectClass}
                    disabled={!!rubro}
                  >
                    {classificationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Los rubros de gasto ordinario se usan en presupuesto detallado; extraordinario queda fuera del anual.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-gray-100 pt-3">
                <label className="flex items-center text-sm text-gray-700 cursor-pointer select-none hover:bg-gray-50 p-2 rounded border border-gray-200">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={rubro?.is_active ?? true}
                    className="rounded text-brand focus:ring-brand mr-2"
                  />
                  Activo
                </label>
                <span className="text-[11px] text-gray-500">
                  Si lo desactivas no aparecera en otros modulos (cobros/egresos) hasta reactivarlo.
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
                disabled={isPending}
                className="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-md text-xs font-bold shadow-md disabled:opacity-50"
              >
                {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear rubro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

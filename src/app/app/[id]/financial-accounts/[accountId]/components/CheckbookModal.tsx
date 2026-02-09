"use client";

import { useRef, useState, useTransition } from "react";
import { createCheckbook } from "../../actions";
import { Plus } from "lucide-react";

type Props = { condominiumId: string; accountId: string };

export default function CheckbookModal({ condominiumId, accountId }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await createCheckbook(condominiumId, accountId, formData);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Chequera creada" });
        setTimeout(() => {
          setOpen(false);
          formRef.current?.reset();
          setMessage(null);
        }, 800);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs font-semibold bg-brand text-white px-3 py-2 rounded-md hover:bg-brand-dark shadow-sm"
      >
        <Plus size={14} />
        Agregar chequera
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Nueva chequera</h3>
                <p className="text-xs text-gray-500">Valida que no se solapen rangos.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">
                &times;
              </button>
            </div>

            <form ref={formRef} onSubmit={submit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
                    Inicio *
                  </label>
                  <input
                    name="start_number"
                    type="number"
                    required
                    className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
                    Fin *
                  </label>
                  <input
                    name="end_number"
                    type="number"
                    required
                    className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">Notas</label>
                <textarea
                  name="notes"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
                  rows={3}
                  placeholder="Referencia o ubicacion fisica"
                />
              </div>

              {message && (
                <div
                  className={`text-xs font-bold p-2 rounded-md text-center ${
                    message.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {message.text}
                </div>
              )}
            </form>

            <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
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
                className="bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-md text-xs font-bold shadow-md disabled:opacity-50"
              >
                {isPending ? "Guardando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

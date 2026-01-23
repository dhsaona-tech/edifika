"use client";

import { useMemo, useState, useTransition } from "react";
import { createRubroPadre } from "../actions";
import { Loader2, X, Plus, Pencil, Save, Check } from "lucide-react";

type RubroRow = { id: string; name: string; annual_amount: number };

type Props = {
  condominiumId: string;
  rubros: RubroRow[];
  setRubros: (updater: (prev: RubroRow[]) => RubroRow[] | RubroRow[]) => void;
  onClose: () => void;
};

export default function RubroManagerModal({ condominiumId, rubros, setRubros, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mostrarMensual, setMostrarMensual] = useState(true);
  const [nuevoRubro, setNuevoRubro] = useState({ name: "", description: "", annual_amount: 0 });
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const totalAnual = useMemo(
    () => rubros.reduce((acc, r) => acc + (Number(r.annual_amount) || 0), 0),
    [rubros]
  );
  const totalMensual = totalAnual / 12;

  const agregarRubro = () => {
    setMessage(null);
    if (!nuevoRubro.name.trim()) {
      setMessage({ type: "error", text: "Ingresa un nombre para el rubro." });
      return;
    }
    startTransition(async () => {
      const result = await createRubroPadre(condominiumId, {
        name: nuevoRubro.name,
        description: nuevoRubro.description || null,
      });
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else if (result?.rubro) {
        setRubros((prev) => [
          ...prev,
          { id: result.rubro.id, name: result.rubro.name, annual_amount: Number(nuevoRubro.annual_amount) || 0 },
        ]);
        setNuevoRubro({ name: "", description: "", annual_amount: 0 });
        setMessage({ type: "success", text: "Rubro creado." });
      }
    });
  };

  const rubrosOrdenados = useMemo(
    () => [...rubros].sort((a, b) => a.name.localeCompare(b.name)),
    [rubros]
  );

  const toggleEditar = (id: string) => {
    setEditandoId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div>
            <p className="text-[11px] uppercase font-semibold text-gray-500">Gestionar rubros</p>
            <h3 className="text-lg font-bold text-gray-800">
              Rubros ordinarios · Total anual {totalAnual.toLocaleString("es-EC", { minimumFractionDigits: 2 })} · Mensual{" "}
              {totalMensual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
          >
            <X />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              placeholder="Nombre del rubro"
              value={nuevoRubro.name}
              onChange={(e) => setNuevoRubro((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20 md:col-span-2"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Valor anual (opcional)"
              value={nuevoRubro.annual_amount}
              onChange={(e) => setNuevoRubro((prev) => ({ ...prev, annual_amount: Number(e.target.value) }))}
              className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20"
            />
            <input
              placeholder="Descripción (opcional)"
              value={nuevoRubro.description}
              onChange={(e) => setNuevoRubro((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20 md:col-span-3"
            />
            <button
              type="button"
              onClick={agregarRubro}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-1 h-10 rounded-md bg-brand text-white text-sm font-semibold px-3 hover:bg-brand-dark shadow-sm disabled:opacity-60 md:col-span-3"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Agregar rubro
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Listado de rubros</p>
            <button
              type="button"
              onClick={() => setMostrarMensual((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-brand px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
            >
              {mostrarMensual ? "Ocultar mensual" : "Ver mensual"}
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Rubro</th>
                  <th className="px-3 py-2 text-left">Valor anual</th>
                  {mostrarMensual && <th className="px-3 py-2 text-left">Mensual</th>}
                  <th className="px-3 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rubrosOrdenados.map((rubro, idx) => {
                  const anual = Number(rubro.annual_amount) || 0;
                  const mensual = anual / 12;
                  const editable = editandoId === rubro.id;
                  return (
                    <tr key={rubro.id} className="hover:bg-gray-50/70">
                      <td className="px-3 py-2 font-semibold text-gray-800">{rubro.name}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={rubro.annual_amount}
                          disabled={!editable}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            setRubros((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], annual_amount: value };
                              return copy;
                            });
                          }}
                          className={`w-full h-9 rounded-md border px-3 text-sm shadow-sm focus:border-brand focus:ring-brand/20 ${
                            editable ? "border-gray-200 bg-white" : "border-transparent bg-gray-50 text-gray-600"
                          }`}
                        />
                      </td>
                      {mostrarMensual && (
                        <td className="px-3 py-2 text-gray-700">
                          {mensual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleEditar(rubro.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-brand px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                          >
                            {editable ? <Save size={14} /> : <Pencil size={14} />}
                            {editable ? "Guardar" : "Editar"}
                          </button>
                          {!editable && <Check size={14} className="text-emerald-600" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rubrosOrdenados.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-center text-gray-500" colSpan={mostrarMensual ? 4 : 3}>
                      No hay rubros. Crea al menos uno.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-3 py-3 font-semibold text-gray-900">Totales</td>
                  <td className="px-3 py-3 font-semibold text-gray-900">
                    {totalAnual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                  </td>
                  {mostrarMensual && (
                    <td className="px-3 py-3 font-semibold text-gray-900">
                      {totalMensual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {message && (
            <div
              className={`text-sm font-semibold px-4 py-3 rounded-md ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200 border border-gray-300 rounded-md"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

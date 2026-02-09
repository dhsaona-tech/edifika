"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Ban, ChevronDown, ChevronRight, Pencil, Power, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoriaRubro, ContextoPresupuestoDetallado, RubroConSubrubros } from "@/types/expense-items";
import RubroPadreForm from "./RubroPadreForm";
import SubrubroForm from "./SubrubroForm";
import { cambiarEstadoRubro, eliminarRubro } from "../actions";

type Props = {
  categoria: CategoriaRubro;
  rubros: RubroConSubrubros[];
  condominiumId: string;
  contextoPresupuesto?: ContextoPresupuestoDetallado;
};

export default function RubrosTree({
  categoria,
  rubros,
  condominiumId,
  contextoPresupuesto,
}: Props) {
  const router = useRouter();
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const padresDisponibles = useMemo(() => rubros.map((r) => r.padre), [rubros]);
  const showPresupuestoCol = categoria === "gasto";
  const hayPresupuestoDetallado =
    showPresupuestoCol && contextoPresupuesto?.budgetType === "detallado";
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const [, startDeleteTransition] = useTransition();

  const toggleRow = (id: string) => {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const EstadoButton = ({ rubroId, activo }: { rubroId: string; activo: boolean }) => {
    const [isPending, startTransition] = useTransition();
    const [localActivo, setLocalActivo] = useState(activo);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              const res = await cambiarEstadoRubro(condominiumId, rubroId, !localActivo);
              if (res?.error) {
                setErrorMsg(res.error);
                return;
              }
              setErrorMsg(null);
              setLocalActivo(!localActivo);
              router.refresh(); // Refresca datos para reflejar estado real
            })
          }
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md border disabled:opacity-50 ${
            localActivo
              ? "text-orange-800 border-orange-300 hover:bg-orange-50"
              : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          }`}
          disabled={isPending}
          title={localActivo ? "Desactivar" : "Activar"}
        >
          <Power size={14} />
          <span className="hidden sm:inline">
            {isPending ? "Guardando..." : localActivo ? "Desactivar" : "Activar"}
          </span>
        </button>
        {errorMsg && (
          <span className="text-[11px] text-red-600 leading-tight">{errorMsg}</span>
        )}
      </div>
    );
  };

  const eliminar = (id: string) => {
    if (!confirm("Esta accion eliminara el rubro. Si tiene subrubros, se eliminaran tambien. Continuar?")) return;
    setDeletePendingId(id);
    startDeleteTransition(async () => {
      const res = await eliminarRubro(condominiumId, id);
      setDeletePendingId(null);
      if (res?.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800 capitalize">{categoria}</p>
          <p className="text-xs text-gray-500">
            Vista en arbol. Expande cada rubro padre para ver sus subrubros. Los subrubros heredan categoria y
            clasificacion para mantener consistencia al registrar egresos/ingresos.
          </p>
        </div>
        {showPresupuestoCol && (
          <div className="text-[11px] text-gray-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md">
            {hayPresupuestoDetallado
              ? "Presupuesto detallado activo: solo rubros padre de gasto ordinario presupuesta egresos base."
              : "Presupuesto global o sin activo: la columna presupuesto es referencial."}
          </div>
        )}
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
          <tr>
            <th className="w-10 px-3 py-3 text-left"></th>
            <th className="px-3 py-3 text-left">Rubro</th>
            <th className="px-3 py-3 text-left">Clasificacion</th>
            {showPresupuestoCol && <th className="px-3 py-3 text-left">Presupuesto activo</th>}
            <th className="px-3 py-3 text-center">Estado</th>
            <th className="px-3 py-3 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rubros.map(({ padre, subrubros }) => {
            const expanded = expandidos[padre.id] || false;
            const badgeClas =
              padre.classification === "ordinario"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-indigo-50 text-indigo-700 border-indigo-100";
            const presupuestoBadge =
              hayPresupuestoDetallado && padre.esta_presupuestado
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-amber-50 text-amber-700 border-amber-100";
            // Para gastos ordinarios (gastos comunes), la edicion debe hacerse desde Presupuesto.
            const edicionBloqueada = categoria === "gasto" && padre.classification === "ordinario";

            return (
              <React.Fragment key={padre.id}>
                <tr key={padre.id} className="hover:bg-gray-50/70">
                  <td className="px-3 py-3 align-top">
                    <button
                      type="button"
                      onClick={() => toggleRow(padre.id)}
                      className="p-1 rounded-md hover:bg-gray-200"
                      title={expanded ? "Contraer" : "Expandir"}
                    >
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-gray-900">{padre.name}</div>
                    <p className="text-xs text-gray-500">{padre.description || "Sin descripcion"}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border ${badgeClas}`}
                    >
                      {padre.classification === "ordinario" ? "Ordinario" : "Extraordinario"}
                    </span>
                  </td>
                  {showPresupuestoCol && (
                    <td className="px-3 py-3">
                      {hayPresupuestoDetallado ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border",
                            presupuestoBadge
                          )}
                        >
                          {padre.esta_presupuestado
                            ? `Presupuestado ${padre.ano_presupuesto || ""}`.trim()
                            : `No presupuestado ${padre.ano_presupuesto || ""}`.trim()}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-500">Global o sin activo</span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-3 text-center">
                    {padre.is_active ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full text-[11px] font-semibold">
                        <BadgeCheck size={14} /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full text-[11px] font-semibold">
                        <Ban size={14} /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <SubrubroForm
                        condominiumId={condominiumId}
                        categoria={categoria}
                        padresDisponibles={padresDisponibles}
                        parentPresetId={padre.id}
                        trigger="button"
                      />
                      <EstadoButton rubroId={padre.id} activo={padre.is_active} />
                      {edicionBloqueada ? (
                        <button
                          type="button"
                          className="p-2 text-gray-400 hover:text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed"
                          title="Los rubros de gasto ordinario se editan desde Presupuesto."
                          disabled
                        >
                          <Pencil size={16} />
                        </button>
                      ) : (
                        <RubroPadreForm condominiumId={condominiumId} rubro={padre} trigger="icon" />
                      )}
                      <button
                        type="button"
                        onClick={() => eliminar(padre.id)}
                          disabled={deletePendingId === padre.id}
                          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                          title="Eliminar rubro"
                        >
                          <Trash2 size={16} />
                        </button>
                    </div>
                  </td>
                </tr>

                {expanded &&
                  subrubros.map((sub) => {
                    const subClasBadge =
                      sub.classification === "ordinario"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-indigo-50 text-indigo-700 border-indigo-100";
                    return (
                      <tr key={sub.id} className="bg-gray-50/30">
                        <td className="px-3 py-2 text-right align-top">
                          <div className="h-full border-l border-dashed border-gray-300 ml-5" />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-gray-400 mt-2" />
                            <div>
                              <div className="font-medium text-gray-800">{sub.name}</div>
                              <p className="text-xs text-gray-500">{sub.description || "Sin descripcion"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border ${subClasBadge}`}
                            >
                              Hereda: {sub.classification}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border bg-slate-100 text-slate-700 border-slate-200">
                              Subrubro de {padre.name}
                            </span>
                          </div>
                        </td>
                        {showPresupuestoCol && (
                          <td className="px-3 py-2 text-[11px] text-gray-500">
                            Presupuesto se maneja en el rubro padre.
                          </td>
                        )}
                        <td className="px-3 py-2 text-center">
                          {sub.is_active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full text-[11px] font-semibold">
                              <BadgeCheck size={14} /> Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full text-[11px] font-semibold">
                              <Ban size={14} /> Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <SubrubroForm
                              condominiumId={condominiumId}
                              categoria={categoria}
                              padresDisponibles={padresDisponibles}
                              subrubro={sub}
                              trigger="icon"
                            />
                            <EstadoButton rubroId={sub.id} activo={sub.is_active} />
                            <button
                              type="button"
                              onClick={() => eliminar(sub.id)}
                              disabled={deletePendingId === sub.id}
                              className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                              title="Eliminar subrubro"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </React.Fragment>
            );
          })}
          {rubros.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={showPresupuestoCol ? 6 : 5}>
                No hay rubros registrados en esta categoria.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

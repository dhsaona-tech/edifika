"use client";

import { Charge } from "@/types/charges";
import { formatCurrency } from "@/lib/utils";
import { eliminarCargo, eliminarCargosMasivos } from "../actions";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

type Props = {
  charges: Charge[];
  condominiumId: string;
};

export default function ChargesTable({ charges, condominiumId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedIds = charges.filter((c) => selected[c.id]).map((c) => c.id);

  const toTitle = (text: string) => text.replace(/\b\w/g, (s) => s.toUpperCase());
  const normalizeDetail = (text?: string | null) => {
    if (!text) return "—";
    const parts = text.split(" - ").map((p) => p.trim());
    if (parts.length === 2 && parts[0] === parts[1]) return parts[0];
    return text;
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    if (selectedIds.length === charges.length) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    charges.forEach((c) => {
      next[c.id] = true;
    });
    setSelected(next);
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Borrar este cargo? Esta acción es permanente.")) return;
    startTransition(async () => {
      const res = await eliminarCargo(condominiumId, id);
      if (res?.error) alert(res.error);
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Borrar ${selectedIds.length} cargos seleccionados? Esta acción es permanente.`)) return;
    startTransition(async () => {
      const res = await eliminarCargosMasivos(condominiumId, selectedIds);
      if (res?.error) alert(res.error);
      else if (res?.bloqueados) {
        alert(`Eliminados: ${res.eliminados}. No se eliminaron ${res.bloqueados} porque tienen pagos.`);
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-sm text-gray-700">Total: {charges.length}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-semibold text-gray-600 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
          >
            {selectedIds.length === charges.length && charges.length > 0 ? "Deseleccionar" : "Seleccionar todos"}
          </button>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={isPending || selectedIds.length === 0}
            className="text-xs font-semibold text-red-600 px-3 py-1 rounded-md border border-red-200 hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Trash2 size={14} /> Borrar seleccionados
          </button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
          <tr>
            <th className="px-3 py-3 text-center"></th>
            <th className="px-3 py-3 text-left">Unidad</th>
            <th className="px-3 py-3 text-left">Responsable</th>
            <th className="px-3 py-3 text-left">Emision</th>
            <th className="px-3 py-3 text-left">Vencimiento</th>
            <th className="px-3 py-3 text-left">Detalle</th>
            <th className="px-3 py-3 text-right">Valor</th>
            <th className="px-3 py-3 text-right">Saldo</th>
            <th className="px-3 py-3 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {charges.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50/70">
              <td className="px-3 py-3 text-center">
                <input
                  type="checkbox"
                  checked={!!selected[c.id]}
                  onChange={() => toggleOne(c.id)}
                  className="rounded text-brand focus:ring-brand"
                />
              </td>
              <td className="px-3 py-3">
                <div className="font-semibold text-gray-900">
                  {toTitle(c.unit?.full_identifier || c.unit?.identifier || "Unidad")}
                </div>
              </td>
              <td className="px-3 py-3 text-gray-800">
                {(() => {
                  const contacts = (c.unit as any)?.unit_contacts;
                  const profile = contacts?.[0]?.profiles;
                  const name = Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name;
                  return name ? `👤 ${name}` : "—";
                })()}
              </td>
              <td className="px-3 py-3 text-gray-800">{c.posted_date}</td>
              <td className="px-3 py-3 text-gray-800">{c.due_date}</td>
              <td className="px-3 py-3 text-gray-800">{normalizeDetail(c.description)}</td>
              <td className="px-3 py-3 text-right text-gray-900 font-semibold">{formatCurrency(c.total_amount)}</td>
              <td className="px-3 py-3 text-right text-gray-900 font-semibold">{formatCurrency(c.balance)}</td>
              <td className="px-3 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={isPending}
                    className="text-red-600 hover:text-red-700 p-1 rounded-md border border-red-200 hover:bg-red-50 disabled:opacity-50"
                    title="Borrar cargo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
              {charges.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={9}>
                    No hay cargos registrados.
                  </td>
                </tr>
              )}
        </tbody>
      </table>
    </div>
  );
}

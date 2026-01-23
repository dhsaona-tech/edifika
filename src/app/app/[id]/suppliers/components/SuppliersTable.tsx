"use client";

import { Mail, Phone } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSupplierStatus } from "../actions";
import SupplierModal from "./SupplierModal";

type Supplier = {
  id: string;
  supplier_type: string;
  fiscal_id: string;
  name: string;
  commercial_name?: string | null;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
  default_expense_item_id?: string | null;
  expense_item?: { id: string; name: string } | null;
};

type ExpenseItem = { id: string; name: string };

export default function SuppliersTable({
  suppliers,
  condominiumId,
  expenseItems,
}: {
  suppliers: Supplier[];
  condominiumId: string;
  expenseItems: ExpenseItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = (supplierId: string, current: boolean) => {
    startTransition(async () => {
      const result = await toggleSupplierStatus(condominiumId, supplierId, !current);
      if (!result?.error) {
        router.refresh();
      } else {
        console.error("No se pudo cambiar el estado del proveedor:", result.error);
      }
    });
  };

  if (!suppliers.length) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 bg-white">
        No hay proveedores. Crea uno para comenzar.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50/80 text-[11px] uppercase tracking-wide text-gray-600 font-bold">
          <tr>
            <th className="px-6 py-3">Tipo</th>
            <th className="px-6 py-3">Identificación</th>
            <th className="px-6 py-3">Nombre legal</th>
            <th className="px-6 py-3">Nombre comercial</th>
            <th className="px-6 py-3">Rubro principal</th>
            <th className="px-6 py-3">Contacto</th>
            <th className="px-6 py-3 text-center">Activo</th>
            <th className="px-6 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {suppliers.map((supplier) => (
            <tr key={supplier.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="px-6 py-3 text-xs font-semibold text-gray-700">
                {supplier.supplier_type || "—"}
              </td>
              <td className="px-6 py-3 text-xs font-mono text-gray-700">{supplier.fiscal_id}</td>
              <td className="px-6 py-3 text-xs font-semibold text-gray-900">{supplier.name}</td>
              <td className="px-6 py-3 text-xs text-gray-700">
                {supplier.commercial_name || "—"}
              </td>
              <td className="px-6 py-3 text-xs text-gray-700">
                {supplier.expense_item?.name ? (
                  supplier.expense_item.name
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Sin rubro
                  </span>
                )}
              </td>
              <td className="px-6 py-3">
                <div className="flex flex-col gap-1 text-xs text-gray-700">
                  {supplier.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail size={14} className="text-gray-400" />
                      <span className="truncate max-w-[140px]">{supplier.email}</span>
                    </span>
                  )}
                  {supplier.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone size={14} className="text-gray-400" />
                      <span>{supplier.phone}</span>
                    </span>
                  )}
                  {!supplier.email && !supplier.phone && (
                    <span className="text-gray-400 italic">Sin contacto</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-3 text-center">
                {supplier.is_active ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                    Sí
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-1 rounded-full">
                    No
                  </span>
                )}
              </td>
              <td className="px-6 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <SupplierModal
                    trigger="icon"
                    supplier={supplier}
                    condominiumId={condominiumId}
                    expenseItems={expenseItems}
                  />
                  <button
                    type="button"
                    onClick={() => handleToggle(supplier.id, supplier.is_active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                      supplier.is_active
                        ? "bg-brand border-brand/60"
                        : "bg-gray-200 border-gray-300"
                    } disabled:opacity-50`}
                    title={supplier.is_active ? "Desactivar" : "Activar"}
                    disabled={isPending}
                    aria-pressed={supplier.is_active}
                  >
                    <span className="sr-only">Cambiar estado</span>
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
                        supplier.is_active ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Edit, X, Save, Building2, Pencil } from "lucide-react";
import { updateUnit } from "../actions";
import { UnitSummary } from "@/types";

export default function EditUnitModal({ 
  unit, 
  condominiumId, 
  iconOnly = false // <--- Nueva propiedad: Si es true, muestra solo ícono
}: { 
  unit: UnitSummary, 
  condominiumId: string,
  iconOnly?: boolean 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async (formData: FormData) => {
    setIsLoading(true);
    const res = await updateUnit(unit.id, condominiumId, formData);
    setIsLoading(false);
    
    if (res?.error) {
      alert(res.error);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* BOTÓN ACTIVADOR (Lógica Dual) */}
      {iconOnly ? (
        // MODO ÍCONO (Para la Tabla) - Estilo moderno
        <button 
          onClick={() => setIsOpen(true)}
          className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-brand transition-all hover:scale-110 hover:shadow-sm group/btn"
          title="Editar Información"
        >
          <Pencil size={16} className="group-hover/btn:scale-110 transition-transform" />
        </button>
      ) : (
        // MODO BOTÓN COMPLETO (Para el Detalle)
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 text-gray-600 hover:text-brand px-4 py-2 rounded-md transition-colors border border-gray-200 bg-white hover:bg-gray-50 shadow-sm font-medium text-sm"
        >
          <Edit size={16} />
          <span>Editar Info</span>
        </button>
      )}

      {/* MODAL (Contenido igual que antes) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-5 border-b bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Building2 size={18} className="text-brand"/>
                Editar Unidad
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form action={handleUpdate} className="p-6 space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Etapa / Torre</label>
                <input 
                  name="block_identifier" 
                  defaultValue={unit.block_identifier || ""} 
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                  placeholder="Ej. Torre A"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
                    <select 
                        name="type" 
                        defaultValue={unit.type} 
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                    >
                        <option value="departamento">Departamento</option>
                        <option value="casa">Casa</option>
                        <option value="local">Local</option>
                        <option value="oficina">Oficina</option>
                        <option value="parqueadero">Parqueadero</option>
                        <option value="bodega">Bodega</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Número</label>
                    <input 
                        name="identifier" 
                        defaultValue={unit.identifier} 
                        required
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Área (m²)</label>
                    <input 
                        name="area" 
                        type="number" 
                        step="0.01"
                        defaultValue={unit.area || 0} 
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Alícuota (%)</label>
                    <input 
                        name="aliquot" 
                        type="number" 
                        step="0.0001"
                        defaultValue={Number(unit.aliquot)} 
                        required
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                    />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 mt-2 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-4 py-2 text-sm bg-brand text-white hover:bg-brand-dark rounded shadow-sm transition-colors flex items-center gap-2 font-medium"
                >
                  {isLoading ? "Guardando..." : <><Save size={16} /> Guardar</>}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}
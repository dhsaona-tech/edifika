"use client";

import { useState, useTransition, useRef } from "react";
import { createOrLinkResident } from "../actions";
import { Plus } from "lucide-react"; // Icono para el botón

interface Props {
  condominiumId: string;
  unitId?: string;
  availableUnits?: { id: string; name: string }[];
}

export default function CreateResidentModal({ condominiumId, unitId, availableUnits = [] }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const closeModal = () => {
    setIsOpen(false);
    setMessage(null);
    formRef.current?.reset();
  };

  const handleSubmit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const result = await createOrLinkResident(condominiumId, unitId || null, formData);
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.message || "Guardado exitosamente." });
        setTimeout(() => closeModal(), 1500);
      }
    });
  };

  // Estilos reutilizables para inputs (Consistencia ERP)
  const labelClass = "block text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1";
  const inputClass = "block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-brand focus:ring-brand/20 h-9 px-3 transition-all bg-white placeholder:text-gray-400";
  const selectClass = "block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-brand focus:ring-brand/20 h-9 px-3 bg-white";

  return (
    <>
      {/* BOTÓN ACTIVADOR (Estilo exacto al de Unidades) */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded-md transition-all shadow-sm hover:shadow-md font-medium text-xs h-[30px] sm:h-auto"
      >
        <Plus size={14} />
        <span className="hidden sm:inline">Nuevo Residente</span>
        <span className="sm:hidden">Nuevo</span>
      </button>

      {/* MODAL OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          
          {/* MODAL CARD */}
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Registrar Nuevo Residente</h3>
                <p className="text-xs text-gray-500 mt-0.5">Ingresa los datos básicos para crear o vincular una persona.</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors">&times;</button>
            </div>

            {/* Formulario con Scroll si es necesario */}
            <div className="overflow-y-auto p-6">
                <form ref={formRef} action={handleSubmit} className="space-y-6">
                
                {/* SECCIÓN 1: DATOS OBLIGATORIOS (Destacados) */}
                <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 mb-4 border-b border-blue-100 pb-2">
                        <span className="text-xs font-bold text-blue-700 uppercase">Datos Obligatorios</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Nombres <span className="text-red-500">*</span></label>
                            <input name="first_name" required className={`${inputClass} border-blue-200 focus:border-blue-400`} placeholder="Ej: Juan Carlos" />
                        </div>
                        <div>
                            <label className={labelClass}>Apellidos <span className="text-red-500">*</span></label>
                            <input name="last_name" required className={`${inputClass} border-blue-200 focus:border-blue-400`} placeholder="Ej: Pérez López" />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelClass}>Correo Electrónico <span className="text-red-500">*</span></label>
                            <input name="email" type="email" required className={`${inputClass} border-blue-200 focus:border-blue-400`} placeholder="usuario@ejemplo.com" />
                            <p className="text-[10px] text-blue-400 mt-1">Este correo será su identificador principal en el sistema.</p>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 2: DETALLES ADICIONALES */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass}>Tipo Doc.</label>
                        <select name="doc_type" className={selectClass}>
                            <option value="CEDULA">Cédula</option>
                            <option value="RUC">RUC</option>
                            <option value="PASAPORTE">Pasaporte</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Identificación</label>
                        <input name="national_id" className={inputClass} placeholder="171..." />
                    </div>
                    <div>
                        <label className={labelClass}>Celular</label>
                        <input name="phone" className={inputClass} placeholder="099..." />
                    </div>
                    <div className="md:col-span-3">
                        <label className={labelClass}>Dirección / Notas</label>
                        <input name="address" className={inputClass} placeholder="Ubicación interna o referencia..." />
                    </div>
                </div>

                {/* SECCIÓN 3: VINCULACIÓN A UNIDAD (Solo si no viene pre-definida) */}
                {!unitId && availableUnits.length > 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                        <h4 className="text-xs font-bold text-yellow-800 uppercase mb-3 flex items-center gap-2">
                            🏠 Asignar Unidad (Opcional)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-yellow-700 uppercase mb-1">Unidad / Inmueble</label>
                                <select name="selected_unit_id" className={`${selectClass} border-yellow-200 focus:border-yellow-400`}>
                                    <option value="">-- Ninguna (Solo Registrar) --</option>
                                    {availableUnits.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-yellow-700 uppercase mb-1">Rol en la Unidad</label>
                                <select name="role" className={`${selectClass} border-yellow-200 focus:border-yellow-400`}>
                                    <option value="TENANT">Inquilino (Arrendatario)</option>
                                    <option value="OWNER">Propietario (Dueño)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* SECCIÓN 4: CONFIGURACIÓN */}
                <div className="flex flex-wrap gap-6 pt-2 border-t border-gray-100">
                    <label className="flex items-center text-sm text-gray-700 cursor-pointer select-none hover:bg-gray-50 p-1 rounded">
                        <input type="checkbox" name="is_legal_entity" className="rounded text-brand focus:ring-brand mr-2" />
                        Es Empresa (Jurídica)
                    </label>
                    
                    <label className="flex items-center text-sm text-gray-700 cursor-pointer select-none hover:bg-gray-50 p-1 rounded">
                        <input type="checkbox" name="lives_in_unit" defaultChecked className="rounded text-brand focus:ring-brand mr-2" />
                        Vive Aquí (Reside)
                    </label>
                </div>

                {/* MENSAJES DE ESTADO */}
                {message && (
                    <div className={`text-xs font-bold p-3 rounded-md text-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                    </div>
                )}

                {/* BOTONES OCULTOS PARA SUBMIT VIA REF SI ES NECESARIO, O VISIBLES AQUI */}
                <div className="hidden"></div> 
                </form>
            </div>

            {/* Footer Fijo */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                <button 
                    type="button" 
                    onClick={closeModal} 
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    onClick={() => formRef.current?.requestSubmit()} // Disparador externo del form
                    disabled={isPending} 
                    className="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-md text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {isPending ? "Guardando..." : "Guardar Residente"}
                </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
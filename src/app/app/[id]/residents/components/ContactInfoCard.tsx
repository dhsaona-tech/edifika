"use client";

import { Profile } from "@/types";
import { updateResidentProfile } from "../actions";
import { useState, useTransition } from "react";

interface ContactInfoCardProps {
  profile: Profile;
  condominiumId: string;
}

export default function ContactInfoCard({ profile, condominiumId }: ContactInfoCardProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const prefs = profile.preferences || { notify_statements: true, notify_receipts: true, notify_news: true };
  
  const handleSubmit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateResidentProfile(condominiumId, profile.id, formData);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: "Datos actualizados." });
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  // --- ESTILOS PERSONALIZADOS (Aquí está el cambio visual) ---
  
  const labelClass = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5";
  
  // CAMBIO: Fondo suave (bg-slate-50) + Borde Morado Sutil (border-purple-200) + Sombra suave
  const inputClass = "block w-full rounded-lg border border-purple-200 bg-slate-50/50 shadow-sm text-sm text-gray-800 focus:border-brand focus:ring-1 focus:ring-brand focus:bg-white h-9 px-3 transition-all placeholder:text-gray-400";
  
  const selectClass = "block w-full rounded-lg border border-purple-200 bg-slate-50/50 shadow-sm text-sm text-gray-800 focus:border-brand focus:ring-1 focus:ring-brand focus:bg-white h-9 px-3 transition-all cursor-pointer";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      
      {/* Header Compacto */}
      <div className="bg-gray-50/80 px-6 py-3 border-b border-gray-200 flex justify-between items-center backdrop-blur-sm">
        <h3 className="text-sm font-bold text-brand flex items-center gap-2">
           ✏️ Editar Información
        </h3>
        <div className="text-[10px] text-gray-400 font-mono">
            ID: {profile.id.split('-')[0]}
        </div>
      </div>

      <form action={handleSubmit} className="p-6">
        
        {/* GRID PRINCIPAL DE DATOS */}
        <div className="grid grid-cols-12 gap-x-5 gap-y-5">

            {/* FILA 1: DOC TYPE (3) | ID (3) | EMAIL (6) */}
            <div className="col-span-12 md:col-span-3">
                <label className={labelClass}>Tipo Documento</label>
                <select name="doc_type" defaultValue={profile.id_type || "CEDULA"} className={selectClass}>
                    <option value="CEDULA">Cédula (CI)</option>
                    <option value="RUC">RUC</option>
                    <option value="PASAPORTE">Pasaporte</option>
                </select>
            </div>
            <div className="col-span-12 md:col-span-3">
                <label className={labelClass}>Identificación *</label>
                <input name="national_id" defaultValue={profile.national_id || ""} className={inputClass} placeholder="Ej: 171..." />
            </div>
            <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Correo Electrónico *</label>
                <input name="email" type="email" required defaultValue={profile.email || ""} className={inputClass} placeholder="usuario@email.com" />
            </div>

            {/* FILA 2: NOMBRES (6) | APELLIDOS (6) */}
            <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Nombres *</label>
                <input name="first_name" required defaultValue={profile.first_name || ""} className={`${inputClass} font-semibold text-gray-900`} />
            </div>
            <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Apellidos *</label>
                <input name="last_name" required defaultValue={profile.last_name || ""} className={`${inputClass} font-semibold text-gray-900`} />
            </div>

            {/* FILA 3: PAIS (3) | CELULAR (3) | DIRECCION (6) */}
            <div className="col-span-12 md:col-span-3">
                <label className={labelClass}>Cód. País</label>
                <select name="country" defaultValue={profile.country || "Ecuador (+593)"} className={selectClass}>
                    <option value="Ecuador (+593)">🇪🇨 +593</option>
                    <option value="USA (+1)">🇺🇸 +1</option>
                    <option value="España (+34)">🇪🇸 +34</option>
                </select>
            </div>
            <div className="col-span-12 md:col-span-3">
                <label className={labelClass}>Celular</label>
                <input name="phone" defaultValue={profile.phone || ""} className={inputClass} placeholder="099..." />
            </div>
             <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Dirección Domiciliaria</label>
                <input name="address" defaultValue={profile.address || ""} className={inputClass} placeholder="Calle principal y secundaria..." />
            </div>

            {/* SEPARADOR VISUAL */}
            <div className="col-span-12 pt-2 pb-1">
                <div className="border-t border-dashed border-gray-200"></div>
            </div>

            {/* FILA 4: FOTO Y TOGGLES (Compacto) */}
            
            {/* FOTO (Izquierda) */}
            <div className="col-span-12 md:col-span-4">
                <label className={labelClass}>Fotografía</label>
                <div className="flex items-center gap-3 p-2 border border-purple-100 rounded-lg bg-slate-50 h-[84px]">
                     <div className="h-12 w-12 rounded-lg bg-white border border-purple-100 flex items-center justify-center text-purple-200">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                     </div>
                     <div>
                        <button type="button" className="text-[11px] bg-white border border-purple-200 hover:bg-purple-50 text-brand px-3 py-1 rounded font-bold transition-colors shadow-sm">
                            Elegir Archivo
                        </button>
                     </div>
                </div>
            </div>

            {/* TOGGLES (Derecha) */}
            <div className="col-span-12 md:col-span-8 grid grid-cols-2 gap-x-6 gap-y-3 bg-white p-1">
                
                <div className="flex items-center justify-between pr-2 border-b border-gray-50 pb-2">
                    <span className="text-xs font-bold text-gray-600">Es Empresa (Jurídica)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="is_legal_entity" defaultChecked={profile.is_legal_entity} className="sr-only peer" />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between pr-2 border-b border-gray-50 pb-2">
                    <span className="text-xs font-bold text-gray-600">Recibir Emails Deuda</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="notify_statements" defaultChecked={prefs.notify_statements} className="sr-only peer" />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                    </label>
                </div>

                 <div className="flex items-center justify-between pr-2">
                    <span className="text-xs font-bold text-gray-600">¿Vive en la unidad?</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="lives_in_unit" defaultChecked={true} className="sr-only peer" />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between pr-2 opacity-60">
                    <span className="text-xs font-bold text-gray-600">Acceso al Sistema</span>
                    <div className="w-9 h-5 bg-gray-200 rounded-full relative cursor-not-allowed">
                        <div className="absolute top-[2px] left-[2px] bg-white h-4 w-4 rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* NOTAS */}
            <div className="col-span-12 mt-2">
                <label className={labelClass}>Notas Internas</label>
                <input name="notes" defaultValue={profile.notes || ""} className={`${inputClass} bg-yellow-50/50 border-yellow-200 focus:border-yellow-400 focus:ring-yellow-200 focus:bg-yellow-50`} placeholder="Observaciones visibles solo para administración..." />
            </div>

        </div>

        {/* FOOTER */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <div className="flex-1 mr-4">
                {message && (
                    <div className={`text-xs font-bold py-1.5 px-3 rounded text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}
            </div>
            
            <button 
                type="button" 
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-transparent hover:border-gray-200 rounded transition-colors"
            >
                Descartar
            </button>
            
            <button 
                type="submit" 
                disabled={isPending}
                className="px-6 py-2 bg-brand hover:bg-brand-dark text-white text-xs font-bold rounded shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
            >
                {isPending ? "Guardando..." : "Guardar Cambios"}
            </button>
        </div>

      </form>
    </div>
  );
}
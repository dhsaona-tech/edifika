"use client";

import { useState, useEffect } from "react";
import { Save, User, CreditCard, Building, DollarSign, AlertCircle } from "lucide-react";
import { createUnit, updateCondoBlocksConfig } from "../actions";
import { Condominium } from "@/types";
import { validateDocument, validateRequired, type DocumentType } from "@/lib/validations";

export default function UnitFormWrapper({ id, initialConfig }: { id: string, initialConfig: Pick<Condominium, 'use_blocks'> | null }) {
  const [useBlocks, setUseBlocks] = useState<boolean | null>(initialConfig?.use_blocks ?? null);
  const [ownerType, setOwnerType] = useState<'DEVELOPER' | 'OWNER'>(null as any);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [docType, setDocType] = useState<DocumentType | "">("");

  useEffect(() => {
    if (initialConfig?.use_blocks !== undefined && initialConfig?.use_blocks !== null) {
        setUseBlocks(initialConfig.use_blocks);
    }
  }, [initialConfig]);

  const handleConfig = async (use: boolean) => {
    setUseBlocks(use);
    await updateCondoBlocksConfig(id, use);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    
    // Validar valor pendiente inicial (obligatorio)
    const initialBalance = formData.get("initial_balance");
    if (initialBalance === null || initialBalance === "") {
      setErrors({ initial_balance: "El valor pendiente inicial es obligatorio (puede ser 0)" });
      setIsLoading(false);
      return;
    }

    const balanceValue = parseFloat(initialBalance as string);
    if (isNaN(balanceValue)) {
      setErrors({ initial_balance: "El valor pendiente debe ser un número válido" });
      setIsLoading(false);
      return;
    }

    // Validar documento si es OWNER
    if (ownerType === 'OWNER') {
      const docType = formData.get("owner_doc_type") as DocumentType;
      const docValue = formData.get("owner_national_id") as string;
      
      if (!docType || !docValue) {
        setErrors({ owner_national_id: "Debe seleccionar tipo de documento y completar el campo" });
        setIsLoading(false);
        return;
      }

      const docValidation = validateDocument(docValue, docType);
      if (!docValidation.isValid) {
        setErrors({ owner_national_id: docValidation.error || "Documento inválido" });
        setIsLoading(false);
        return;
      }

      formData.append("is_quick_owner", "true");
    }
    
    const res = await createUnit(id, formData);
    if (res?.error) {
      setErrors({ submit: res.error });
      setIsLoading(false);
    }
  };

  if (useBlocks === null) {
    return (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-8 rounded-md shadow-sm mt-6 max-w-2xl mx-auto">
            <p className="font-bold mb-3 text-base">⚠️ Configuración Inicial</p>
            <p className="mb-6 text-sm opacity-90">¿Este condominio utiliza Etapas, Torres o Bloques?</p>
            <div className="flex gap-4">
                <button onClick={() => handleConfig(true)} className="px-6 py-2.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors font-medium">
                    Sí, usa Torres
                </button>
                <button onClick={() => handleConfig(false)} className="px-6 py-2.5 text-sm bg-white border border-yellow-600 text-yellow-800 rounded hover:bg-yellow-50 transition-colors font-medium">
                    No, es plano
                </button>
            </div>
        </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
        {/* Aumenté gap-8 para más espacio entre columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* COLUMNA IZQUIERDA */}
            <div className="bg-white rounded-lg shadow border border-secondary-dark p-8 space-y-6 h-fit">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-2">
                    <Building size={16} className="text-brand"/> Detalles del Inmueble
                </h3>
                
                <div className="grid grid-cols-12 gap-4">
                    {useBlocks && (
                        <div className="col-span-4 space-y-2">
                            <label className="text-sm font-medium text-gray-500">Torre/Etapa</label>
                            <input name="block_identifier" placeholder="Ej. A" className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all" />
                        </div>
                    )}
                    <div className={`${useBlocks ? 'col-span-8' : 'col-span-12'} space-y-2`}>
                        <label className="text-sm font-medium text-gray-500">Número / ID *</label>
                        <input name="identifier" type="text" placeholder="Ej. 101" required className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-500">Tipo *</label>
                        <select name="type" required className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/50">
                            <option value="">Seleccione un tipo *</option>
                            <option value="departamento">Departamento</option>
                            <option value="casa">Casa</option>
                            <option value="local">Local</option>
                            <option value="parqueadero">Parqueadero</option>
                            <option value="bodega">Bodega</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-500">Área (m²)</label>
                        <input name="area" type="number" step="0.01" placeholder="0.00" className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Alícuota (%) *</label>
                    <input name="aliquot" type="number" step="0.0001" min="0" max="100" placeholder="Ej. 1.50" required className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50" />
                </div>

                {/* VALOR PENDIENTE INICIAL - OBLIGATORIO */}
                <div className="space-y-2 pt-2 border-t border-gray-200">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <DollarSign size={14} className="text-brand" />
                        Valor Pendiente Inicial *
                    </label>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                        <div className="flex items-start gap-2">
                            <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                            <div className="text-xs text-amber-800">
                                <p className="font-semibold mb-1">Campo obligatorio</p>
                                <p className="text-amber-700">Ingrese el saldo pendiente al momento de crear la unidad. Use valores negativos para saldos a favor (ej: -50) o positivos para deudas (ej: 2000). Si no hay saldo, ingrese 0.</p>
                            </div>
                        </div>
                    </div>
                    <input 
                        name="initial_balance" 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00 (obligatorio)" 
                        required 
                        className={`w-full border rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 ${
                            errors.initial_balance ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                    />
                    {errors.initial_balance && (
                        <p className="text-xs text-red-600 mt-1">{errors.initial_balance}</p>
                    )}
                </div>
            </div>

            {/* COLUMNA DERECHA */}
            <div className="bg-white rounded-lg shadow border border-secondary-dark p-8 space-y-6 h-fit">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-2">
                    <User size={16} className="text-brand"/> Responsable Inicial
                </h3>
                
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">¿A quién pertenece? *</label>
                    <select 
                        name="initial_owner_type" 
                        required
                        className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all font-medium"
                        onChange={(e) => setOwnerType(e.target.value as any)}
                        defaultValue=""
                    >
                        <option value="">Seleccione una opción *</option>
                        <option value="DEVELOPER">Constructora / Inventario (Stock)</option>
                        <option value="OWNER">Propietario Real (Asignar ahora)</option>
                    </select>
                </div>

                {ownerType === 'OWNER' ? (
                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="bg-brand/5 p-5 rounded border border-brand/10 space-y-4">
                            <p className="text-xs text-brand font-bold uppercase tracking-wide mb-2">Datos del Propietario</p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <input name="owner_name" placeholder="Nombre *" required className="w-full border px-3 py-2 rounded text-sm focus:border-brand outline-none" />
                                <input name="owner_lastname" placeholder="Apellido *" required className="w-full border px-3 py-2 rounded text-sm focus:border-brand outline-none" />
                            </div>
                            
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-600">Tipo de Documento *</label>
                                    <select 
                                        name="owner_doc_type" 
                                        required
                                        className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/50"
                                        onChange={(e) => setDocType(e.target.value as DocumentType)}
                                        defaultValue=""
                                    >
                                        <option value="">Seleccione tipo *</option>
                                        <option value="CEDULA">Cédula (10 dígitos)</option>
                                        <option value="RUC">RUC (13 dígitos)</option>
                                        <option value="PASAPORTE">Pasaporte</option>
                                    </select>
                                </div>
                                <div className="relative">
                                    <CreditCard size={14} className="absolute left-3 top-3 text-gray-400"/>
                                    <input 
                                        name="owner_national_id" 
                                        placeholder={docType === "CEDULA" ? "Ej: 1712345678 (10 dígitos)" : docType === "RUC" ? "Ej: 1712345678001 (13 dígitos)" : "Número de documento *"} 
                                        required 
                                        className={`w-full border pl-9 pr-3 py-2.5 rounded text-sm focus:border-brand outline-none ${
                                            errors.owner_national_id ? 'border-red-300 bg-red-50' : ''
                                        }`}
                                    />
                                </div>
                                {errors.owner_national_id && (
                                    <p className="text-xs text-red-600 mt-1">{errors.owner_national_id}</p>
                                )}
                                <input name="owner_email" type="email" placeholder="Correo Electrónico *" required className="w-full border px-3 py-2.5 rounded text-sm focus:border-brand outline-none" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="pt-2">
                        <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm text-gray-500 italic leading-relaxed">
                            La unidad se asignará al inventario de la administración (Constructora) hasta que se registre una venta.
                        </div>
                    </div>
                )}
            </div>
        </div>

        {errors.submit && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
        )}

        <div className="mt-8 flex justify-end">
            <button 
                type="submit" 
                disabled={isLoading}
                className={`flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-10 py-3 rounded-md transition-all shadow-md font-medium text-sm ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
                {isLoading ? "Guardando..." : <><Save size={18} /> Guardar Unidad</>}
            </button>
        </div>
    </form>
  );
}
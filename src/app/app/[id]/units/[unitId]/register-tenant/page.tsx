import { ArrowLeft, Save, User, Mail, Phone, CalendarDays, CreditCard } from "lucide-react";
import Link from "next/link";
import { registerNewTenant } from "../../actions"; // Importamos la acción del módulo padre

interface PageProps {
  params: Promise<{ id: string; unitId: string }>;
}

export default async function RegisterTenantPage({ params }: PageProps) {
  const { id, unitId } = await params;

  const handleRegisterTenant = async (formData: FormData) => {
    "use server";
    await registerNewTenant(id, unitId, formData);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href={`/app/${id}/units/${unitId}`}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Registrar Nuevo Inquilino</h1>
          <p className="text-sm text-gray-500">Asigna un arrendatario y actualiza la ocupación de la unidad.</p>
        </div>
      </div>

      {/* Formulario */}
      <form action={handleRegisterTenant} className="bg-white rounded-lg shadow border border-secondary-dark p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* Sección Datos */}
        <div className="space-y-5">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                <User size={16} className="text-brand"/> Datos del Contacto
            </h3>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Nombre *</label>
                <input 
                    name="first_name" 
                    type="text" 
                    placeholder="Ej. Juan" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                    required
                />
                </div>
                <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Apellido *</label>
                <input 
                    name="last_name" 
                    type="text" 
                    placeholder="Ej. Pérez" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                    required
                />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <CreditCard size={14}/> Cédula / RUC *
                </label>
                <input 
                    name="national_id" 
                    type="text" 
                    placeholder="Ej. 1712345678" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Mail size={14}/> Email</label>
                <input 
                    name="email" 
                    type="email" 
                    placeholder="inquilino@email.com" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                />
                </div>
                <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Phone size={14}/> Teléfono</label>
                <input 
                    name="phone" 
                    type="tel" 
                    placeholder="+593 99..." 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                />
                </div>
            </div>
        </div>

        {/* Sección Arriendo */}
        <div className="space-y-5 pt-2">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                <CalendarDays size={16} className="text-brand"/> Términos del Arriendo
            </h3>
            
            <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Fecha de Inicio *</label>
            <input 
                name="start_date" 
                type="date" 
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                required 
                defaultValue={new Date().toISOString().substring(0, 10)} 
            />
            <p className="text-xs text-gray-500">
                Esta fecha marcará el inicio de la responsabilidad del inquilino y el fin de la ocupación del anterior.
            </p>
            </div>
            
            <div className="flex items-start gap-3 bg-gray-50 p-3 rounded border border-gray-200">
                <div className="flex h-5 items-center">
                    <input 
                        type="checkbox" 
                        name="receives_emails" 
                        id="receives_emails" 
                        defaultChecked 
                        className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                </div>
                <div className="text-sm">
                    <label htmlFor="receives_emails" className="font-medium text-gray-700 cursor-pointer">Enviar notificaciones de cobro</label>
                    <p className="text-gray-500 text-xs">El inquilino recibirá los estados de cuenta y recibos de pago por correo.</p>
                </div>
            </div>
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <Link 
                href={`/app/${id}/units/${unitId}`}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
                Cancelar
            </Link>
            <button 
                type="submit"
                className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-md transition-colors font-medium shadow-sm"
            >
                <Save size={18} />
                Guardar Inquilino
            </button>
        </div>

      </form>
    </div>
  );
}
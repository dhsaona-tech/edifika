import { ArrowLeft, Save, User, Mail, Phone, CalendarDays, CreditCard, FileText } from "lucide-react";
import Link from "next/link";
import { registerSale } from "../../actions"; // La crearemos en el siguiente paso

interface PageProps {
  params: Promise<{ id: string; unitId: string }>;
}

export default async function RegisterSalePage({ params }: PageProps) {
  const { id, unitId } = await params;

  const handleRegisterSale = async (formData: FormData) => {
    "use server";
    await registerSale(id, unitId, formData);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href={`/app/${id}/units/${unitId}`}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Registrar Venta / Cambio de Dueño</h1>
          <p className="text-sm text-gray-500">Finaliza la vigencia del propietario actual y asigna uno nuevo.</p>
        </div>
      </div>

      {/* Formulario */}
      <form action={handleRegisterSale} className="bg-white rounded-lg shadow border border-secondary-dark p-6 space-y-6">
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md">
            <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Esta acción archivará al propietario actual en el historial y asignará la deuda futura al nuevo dueño.
            </p>
        </div>

        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">Datos del Nuevo Propietario</h3>

        <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><User size={14}/> Nombre *</label>
              <input name="first_name" type="text" placeholder="María" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand/50 outline-none" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Apellido *</label>
              <input name="last_name" type="text" placeholder="Gómez" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand/50 outline-none" required />
            </div>
        </div>

        <div className="space-y-2">
             <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><CreditCard size={14}/> Cédula / RUC *</label>
             <input name="national_id" type="text" placeholder="Ej. 1712345678" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand/50 outline-none" required />
        </div>

        <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Mail size={14}/> Email *</label>
              <input name="email" type="email" placeholder="nuevo.dueno@email.com" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand/50 outline-none" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Phone size={14}/> Teléfono</label>
              <input name="phone" type="tel" placeholder="Ej. +593999999999" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand/50 outline-none" />
            </div>
        </div>

        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2 pt-4">Detalles de la Transacción</h3>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><CalendarDays size={14}/> Fecha de Venta / Escrituración *</label>
          <input name="start_date" type="date" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand/50 outline-none" required defaultValue={new Date().toISOString().substring(0, 10)} />
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><FileText size={14}/> Notas Internas</label>
            <textarea name="notes" rows={2} placeholder="Ref. Escritura, Notaría, etc." className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand/50 outline-none"></textarea>
        </div>
        
        <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" name="is_occupant" id="is_occupant" defaultChecked className="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand" />
            <label htmlFor="is_occupant" className="text-sm font-medium text-gray-700">
                El nuevo dueño vivirá en la unidad (Ocupante).
            </label>
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t">
            <Link href={`/app/${id}/units/${unitId}`} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors">Cancelar</Link>
            <button type="submit" className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-md transition-colors font-medium shadow-sm">
                <Save size={18} /> Registrar Venta
            </button>
        </div>

      </form>
    </div>
  );
}
import { getCondominiumInfo } from "./actions";
import CondominiumForm from "./components/CondominiumForm";
import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MyCondominioPage({ params }: PageProps) {
  const { id } = await params;
  const condominium = await getCondominiumInfo(id);

  if (!condominium) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <p className="text-red-600">No se pudo cargar la información del condominio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
        <Link
          href={`/app/${id}`}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-brand hover:border-brand/30 transition-all shadow-sm"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
            <Building2 size={20} className="text-brand" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Mi Condominio</h1>
            <p className="text-xs text-gray-500">Información general y configuración</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <CondominiumForm condominiumId={id} initialData={condominium} />
    </div>
  );
}

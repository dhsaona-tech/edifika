import { getCondominiumConfig } from "../actions";
import UnitFormWrapper from "../components/UnitFormWrapper";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewUnitPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const config = await getCondominiumConfig(id);

    return (
        <div className="max-w-5xl mx-auto"> {/* Aumenté el ancho a 5xl para que quepan las 2 columnas */}
            
            {/* Header Compacto */}
            <div className="flex items-center gap-3 mb-4 border-b border-gray-200 pb-3">
                <Link 
                    href={`/app/${id}/units`}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-secondary-dark text-gray-600 hover:text-brand hover:border-brand/30 transition-all shadow-sm"
                >
                    <ArrowLeft size={16} />
                </Link>
                <div>
                    <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">Nueva Unidad</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Creación rápida de inmueble y responsable.</p>
                </div>
            </div>

            <UnitFormWrapper id={id} initialConfig={config} />
        </div>
    );
}
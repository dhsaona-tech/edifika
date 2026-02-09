import { getExtraordinaryPlans } from "./actions";
import ExtraordinaryPlansList from "./components/ExtraordinaryPlansList";
import { Layers, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function ExtraordinaryPlansPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { status } = await searchParams;

  const plans = await getExtraordinaryPlans(id, { status });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/app/${id}/charges`}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-brand hover:border-brand/30 transition-all shadow-sm"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center border border-purple-200">
              <Layers size={20} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                Planes Extraordinarios
              </h1>
              <p className="text-xs text-gray-500">
                Cuotas extraordinarias diferidas para proyectos especiales
              </p>
            </div>
          </div>
        </div>

        <Link
          href={`/app/${id}/extraordinary-plans/new`}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-md transition-all shadow-sm hover:shadow-md font-medium text-sm"
        >
          <Plus size={16} />
          Nuevo Plan
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <Link
          href={`/app/${id}/extraordinary-plans`}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !status || status === "todos"
              ? "bg-brand text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Todos
        </Link>
        <Link
          href={`/app/${id}/extraordinary-plans?status=borrador`}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            status === "borrador"
              ? "bg-yellow-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Borrador
        </Link>
        <Link
          href={`/app/${id}/extraordinary-plans?status=activo`}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            status === "activo"
              ? "bg-green-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Activos
        </Link>
        <Link
          href={`/app/${id}/extraordinary-plans?status=completado`}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            status === "completado"
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Completados
        </Link>
      </div>

      {/* Lista */}
      <ExtraordinaryPlansList condominiumId={id} plans={plans} />
    </div>
  );
}

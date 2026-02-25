import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listarBatches } from "../actions";
import BatchesTable from "../components/BatchesTable";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?: { status?: string } | Promise<{ status?: string }>;
};

export default async function BatchesPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  const condominiumId = resolvedParams.id;
  const filters = {
    status: resolvedSearch?.status || "activo",
  };

  const batches = await listarBatches(condominiumId, filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lotes de Cargos</h1>
          <p className="text-sm text-muted-foreground">
            Historial de generaciones masivas. Puedes eliminar un lote completo si no tiene pagos asociados.
          </p>
        </div>
        <Link
          href={`/app/${condominiumId}/charges`}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-md hover:bg-gray-50"
        >
          <ArrowLeft size={14} />
          Volver a cargos
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Estado</label>
          <div className="flex gap-2">
            <Link
              href={`/app/${condominiumId}/charges/batches?status=activo`}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                filters.status === "activo"
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Activos
            </Link>
            <Link
              href={`/app/${condominiumId}/charges/batches?status=eliminado`}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                filters.status === "eliminado"
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Eliminados
            </Link>
            <Link
              href={`/app/${condominiumId}/charges/batches?status=todos`}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                filters.status === "todos"
                  ? "bg-gray-700 text-white border-gray-700"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Todos
            </Link>
          </div>
        </div>
      </div>

      <BatchesTable batches={batches} condominiumId={condominiumId} />
    </div>
  );
}

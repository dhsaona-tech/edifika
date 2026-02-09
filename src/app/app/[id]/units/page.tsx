import Link from "next/link";
import { getUnits } from "./actions";
import UnitsStatsCards from "./components/UnitsStatsCards";
import UnitsTable from "./components/UnitsTable";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?:
    | {
        search?: string;
        type?: string;
        status?: string;
      }
    | Promise<{
        search?: string;
        type?: string;
        status?: string;
      }>;
};

export default async function UnitsPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const condominiumId = resolvedParams.id;

  const searchQuery = resolvedSearch?.search;
  const typeFilter = resolvedSearch?.type;

  const units = await getUnits(condominiumId, searchQuery, typeFilter);

  // Calcular stats
  const stats = {
    total: units.length,
    active: units.filter(u => u.status === 'activa').length,
    inactive: units.filter(u => u.status === 'inactiva').length,
    byType: {
      departamento: units.filter(u => u.type === 'departamento').length,
      casa: units.filter(u => u.type === 'casa').length,
      bodega: units.filter(u => u.type === 'bodega').length,
      parqueo: units.filter(u => u.type === 'parqueo' || u.type === 'parqueadero').length,
      local: units.filter(u => u.type === 'local').length,
      otro: units.filter(u => !['departamento', 'casa', 'bodega', 'parqueo', 'parqueadero', 'local'].includes(u.type)).length,
    }
  };

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Unidades</h1>
          <p className="text-[11px] text-gray-500">Gestión de departamentos, casas, bodegas y parqueos</p>
        </div>
        <Link
          href={`/app/${condominiumId}/units/new`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand text-white px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-brand-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva unidad
        </Link>
      </div>

      {/* Stats Cards */}
      <UnitsStatsCards stats={stats} />

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <form method="GET" className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              name="search"
              placeholder="Buscar unidad..."
              defaultValue={searchQuery || ""}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>
          <select
            name="type"
            defaultValue={typeFilter || ""}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-brand focus:border-brand"
          >
            <option value="">Todos los tipos</option>
            <option value="departamento">🏢 Departamento</option>
            <option value="casa">🏠 Casa</option>
            <option value="local">🏪 Local</option>
            <option value="bodega">📦 Bodega</option>
            <option value="parqueo">🚗 Parqueo</option>
            <option value="otro">🔲 Otro</option>
          </select>
          <button
            type="submit"
            className="px-4 py-1.5 bg-brand text-white rounded-md font-semibold text-xs hover:bg-brand-dark transition-colors whitespace-nowrap"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Table */}
      <UnitsTable units={units as any} condominiumId={condominiumId} />
    </div>
  );
}
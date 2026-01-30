export default function UnitsStatsCards({ stats }: { stats: any }) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center">
                <span className="text-lg">🏢</span>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="flex gap-3 text-xs pt-2 border-t border-gray-100">
            <span className="text-emerald-600 font-medium">✓ {stats.active}</span>
            <span className="text-gray-400">{stats.inactive} inactivas</span>
          </div>
        </div>
  
        {/* Viviendas */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center">
                <span className="text-lg">🏠</span>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Viviendas</p>
            </div>
            <p className="text-2xl font-bold text-brand">
              {stats.byType.departamento + stats.byType.casa}
            </p>
          </div>
          <div className="flex gap-3 text-xs pt-2 border-t border-gray-100">
            <span className="text-gray-600">{stats.byType.departamento} Dptos</span>
            <span className="text-gray-600">{stats.byType.casa} Casas</span>
          </div>
        </div>
  
        {/* Bodegas */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center">
                <span className="text-lg">📦</span>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bodegas</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.byType.bodega}</p>
          </div>
        </div>
  
        {/* Parqueos */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center">
                <span className="text-lg">🚗</span>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Parqueos</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.byType.parqueo}</p>
          </div>
        </div>
      </div>
    );
  }
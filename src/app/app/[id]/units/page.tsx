import { Building2, Plus, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getUnits, getCondoTotalAliquot, getActiveBudgetInfo } from "./actions";
import UnitsTable from "./components/UnitsTable";
import UnitsToolbar from "./components/UnitsToolbar";

// NOTA: esta página se mantuvo como servidor en tu código original;
// aquí reusamos la lógica pero movemos la barra a un layout unificado.

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ query?: string; type?: string }>;
}

export default async function UnitsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { query, type } = await searchParams;

  const [units, totalAliquot, activeBudget] = await Promise.all([
    getUnits(id, query || "", type || "todos"),
    getCondoTotalAliquot(id),
    getActiveBudgetInfo(id),
  ]);

  const difference = 100 - totalAliquot;
  const isWithinTolerance = Math.abs(difference) < 0.1;

  let statusColor = "bg-yellow-50 text-yellow-700 border-yellow-200";
  let statusIcon = <AlertTriangle size={12} />;
  let statusText = "";

  if (isWithinTolerance) {
    statusColor = "bg-green-50 text-green-700 border-green-200";
    statusIcon = <CheckCircle size={12} />;
    statusText = "100%";
  } else {
    if (difference > 0) statusText = `Falta ${difference.toFixed(2)}%`;
    else statusText = `Excede ${Math.abs(difference).toFixed(2)}%`;
  }

  // Calcular valor estimado por unidad si hay presupuesto activo
  const activeUnits = units.filter((u) => u.status === "activa");
  const monthlyTotal = activeBudget ? activeBudget.total_annual_amount / 12 : 0;
  const method = activeBudget?.distribution_method || "por_aliquota";
  const chargesByUnit: Record<string, number | null> = {};

  const round2 = (n: number) => Math.round(n * 100) / 100;

  if (activeBudget && activeUnits.length > 0) {
    if (method === "igualitario") {
      const base = monthlyTotal / activeUnits.length;
      activeUnits.forEach((u) => {
        chargesByUnit[u.id] = round2(base);
      });
    } else if (method === "por_aliquota" && totalAliquot > 0) {
      activeUnits.forEach((u) => {
        const val = monthlyTotal * (Number(u.aliquot || 0) / totalAliquot);
        chargesByUnit[u.id] = round2(val);
      });
    } else if (method === "manual_por_unidad") {
      activeUnits.forEach((u) => {
        chargesByUnit[u.id] = null; // pendiente de definir manual
      });
    }
  }

  return (
    <div className="space-y-3">
      {/* HEADER COMPACTO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-800 tracking-tight">Gestión de Unidades</h1>
            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-medium border border-gray-200">
              {units.length}
            </span>

            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusColor}`}>
              {statusIcon}
              <span>{totalAliquot.toFixed(2)}%</span>
              {!isWithinTolerance && (
                <span className="opacity-80 ml-1 font-normal border-l pl-1 border-current">
                  {statusText}
                </span>
              )}
            </div>
          </div>
        </div>

        <Link
          href={`/app/${id}/units/new`}
          className="flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded-md transition-all shadow-sm hover:shadow-md font-medium text-xs"
        >
          <Plus size={14} />
          <span>Nueva Unidad</span>
        </Link>
      </div>

      {/* TOOLBAR UNIFICADA */}
      <UnitsToolbar condominiumId={id} />

      {/* TABLA */}
      {units.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-2 text-gray-300">
            <Building2 size={20} />
          </div>
          <p className="text-xs text-gray-500">
            {query || type ? "No hay resultados." : "No hay unidades registradas."}
          </p>
          {!query && (
            <Link
              href={`/app/${id}/units/new`}
              className="mt-2 text-brand font-semibold hover:underline underline-offset-4 text-xs"
            >
              Crear unidad &rarr;
            </Link>
          )}
        </div>
      ) : (
        <UnitsTable
          units={units}
          condominiumId={id}
          estimatedCharges={chargesByUnit}
          distributionMethod={method}
        />
      )}
    </div>
  );
}

// Toolbar se movió a componente cliente en components/UnitsToolbar.tsx

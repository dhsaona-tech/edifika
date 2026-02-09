"use client";

import { useMemo, useState } from "react";
import {
  CategoriaRubro,
  ContextoPresupuestoDetallado,
  RubroConSubrubros,
} from "@/types/expense-items";
import RubrosTree from "./RubrosTree";

type Props = {
  condominiumId: string;
  rubrosGasto: RubroConSubrubros[];
  rubrosIngreso: RubroConSubrubros[];
  contextoPresupuesto: ContextoPresupuestoDetallado;
  defaultTab?: CategoriaRubro;
};

export default function RubrosClient({
  condominiumId,
  rubrosGasto,
  rubrosIngreso,
  contextoPresupuesto,
  defaultTab = "gasto",
}: Props) {
  const [tab, setTab] = useState<CategoriaRubro>(defaultTab);

  const rubrosActuales = useMemo(
    () => (tab === "gasto" ? rubrosGasto : rubrosIngreso),
    [tab, rubrosGasto, rubrosIngreso]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["gasto", "ingreso"] as CategoriaRubro[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setTab(cat)}
            className={`px-4 py-2 rounded-md text-sm font-semibold border transition-colors ${
              tab === cat
                ? "bg-brand text-white border-brand shadow-sm"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {cat === "gasto" ? "Gastos" : "Ingresos"}
          </button>
        ))}
        <span className="text-xs text-gray-500 ml-2">
          Total padres: {rubrosActuales.length} {tab === "gasto" ? "gastos" : "ingresos"}
        </span>
      </div>

      <RubrosTree
        categoria={tab}
        rubros={rubrosActuales}
        condominiumId={condominiumId}
        contextoPresupuesto={contextoPresupuesto}
      />
    </div>
  );
}

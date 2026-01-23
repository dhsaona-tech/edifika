import RubrosClient from "./components/RubrosClient";
import RubroPadreForm from "./components/RubroPadreForm";
import { getContextoPresupuesto, getRubrosPorCategoria } from "./actions";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?: { tab?: string } | Promise<{ tab?: string }>;
};

export default async function ExpenseItemsPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  const condominiumId = resolvedParams.id;
  const defaultTab = resolvedSearch?.tab === "ingreso" ? "ingreso" : "gasto";

  const contextoPresupuesto = await getContextoPresupuesto(condominiumId);
  const [rubrosGasto, rubrosIngreso] = await Promise.all([
    getRubrosPorCategoria(condominiumId, "gasto", contextoPresupuesto),
    getRubrosPorCategoria(condominiumId, "ingreso", contextoPresupuesto),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rubros</h1>
          <p className="text-sm text-muted-foreground">
            Administra rubros de gasto e ingreso. En presupuesto detallado solo los rubros padre de gasto ordinario se
            usan para egresos ordinarios; los subrubros solo clasifican y heredan categoria y clasificacion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RubroPadreForm condominiumId={condominiumId} categoriaForzada="gasto" />
          <RubroPadreForm condominiumId={condominiumId} categoriaForzada="ingreso" />
        </div>
      </div>

      <RubrosClient
        condominiumId={condominiumId}
        rubrosGasto={rubrosGasto}
        rubrosIngreso={rubrosIngreso}
        contextoPresupuesto={contextoPresupuesto}
        defaultTab={defaultTab}
      />
    </div>
  );
}

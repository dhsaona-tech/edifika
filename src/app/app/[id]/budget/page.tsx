import { getBudgetsMaster } from "./actions";
import BudgetFilters from "./components/BudgetFilters";
import BudgetsTable from "./components/BudgetsTable";
import Link from "next/link";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?: { year?: string; status?: string } | Promise<{ year?: string; status?: string }>;
};

export default async function BudgetPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  const condominiumId = resolvedParams.id;
  const filters = {
    year: resolvedSearch?.year,
    status: resolvedSearch?.status,
  };

  const { budgets, activeBudgetId } = await getBudgetsMaster(condominiumId, filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Presupuestos Anuales</h1>
          <p className="text-sm text-muted-foreground">
            Crea, edita y marca el presupuesto activo. Soporta presupuesto global o detallado por rubros.
          </p>
        </div>
        <Link
          href={`/app/${condominiumId}/budget/new`}
          className="flex items-center gap-2 bg-brand text-white px-3 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark shadow-sm"
        >
          Nuevo presupuesto
        </Link>
      </div>

      <BudgetFilters />

      <BudgetsTable
        condominiumId={condominiumId}
        budgets={budgets}
        activeBudgetId={activeBudgetId}
      />
    </div>
  );
}

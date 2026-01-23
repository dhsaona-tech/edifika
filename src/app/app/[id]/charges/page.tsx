import Link from "next/link";
import { Tag, Droplets } from "lucide-react";
import { listarCharges, getRubrosIngreso, getUnitsForCharges } from "./actions";
import ChargesFilters from "./components/ChargesFilters";
import ChargesTable from "./components/ChargesTable";
import ChargeIndividualForm from "./components/ChargeIndividualForm";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?:
    | { period?: string; status?: string; expenseItemId?: string; unitId?: string; page?: string }
    | Promise<{ period?: string; status?: string; expenseItemId?: string; unitId?: string; page?: string }>;
};

export default async function ChargesPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  const condominiumId = resolvedParams.id;
  const filters = {
    period: resolvedSearch?.period,
    status: "pendiente", // solo pendientes; los pagados ya no se listan
    expenseItemId: resolvedSearch?.expenseItemId,
    unitId: resolvedSearch?.unitId,
    page: resolvedSearch?.page ? Number(resolvedSearch.page) : 1,
    pageSize: 20,
  };

  const [listado, rubros, unidadesBase] = await Promise.all([
    listarCharges(condominiumId, filters),
    getRubrosIngreso(condominiumId),
    getUnitsForCharges(condominiumId),
  ]);

  const expenseItemsOptions = rubros.map((r) => ({ value: r.id, label: r.name }));
  const unitsOptions = unidadesBase.map((u) => ({ value: u.unit_id, label: u.unit_name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cuentas por Cobrar</h1>
          <p className="text-sm text-muted-foreground">Listado de cargos generados.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/app/${condominiumId}/charges/generate#expensas`}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 text-white px-4 py-2 text-xs font-semibold shadow-sm hover:bg-blue-700"
        >
          <Tag size={14} /> Cuotas por Expensas
        </Link>
        <ChargeIndividualForm
          condominiumId={condominiumId}
          expenseItems={expenseItemsOptions}
          units={unitsOptions}
          label="Cuota individual"
          className="inline-flex items-center gap-2 rounded-md bg-sky-500 text-white px-4 py-2 text-xs font-semibold shadow-sm hover:bg-sky-600"
        />
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 rounded-md bg-purple-300 text-white px-4 py-2 text-xs font-semibold shadow-sm disabled:opacity-70"
          title="Consumo de servicios (en desarrollo)"
        >
          <Droplets size={14} /> Consumo de servicios
        </button>
      </div>

      <ChargesFilters expenseItems={expenseItemsOptions} units={unitsOptions} />

      <ChargesTable charges={listado.charges} condominiumId={condominiumId} />
    </div>
  );
}

import Link from "next/link";
import { getActiveDistributionMethod, getRubrosIngreso, getUnitsForCharges } from "../actions";
import ChargeWizardExpensas from "../components/ChargeWizardExpensas";
import ChargeWizardServicios from "../components/ChargeWizardServicios";
import ChargeIndividualForm from "../components/ChargeIndividualForm";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

export default async function ChargesGeneratePage({ params }: PageProps) {
  const resolvedParams = await params;
  const condominiumId = resolvedParams.id;

  const [rubros, unidadesBase, metodo] = await Promise.all([
    getRubrosIngreso(condominiumId),
    getUnitsForCharges(condominiumId),
    getActiveDistributionMethod(condominiumId),
  ]);

  const expenseItemsOptions = rubros.map((r) => ({ value: r.id, label: r.name }));
  const unitsOptions = unidadesBase.map((u) => ({ value: u.unit_id, label: u.unit_name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Generar cuentas por cobrar</h1>
          <p className="text-sm text-muted-foreground">Expensas mensuales, servicios básicos y cargos individuales.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/app/${condominiumId}/charges`}
            className="px-3 py-2 text-xs font-semibold border border-gray-200 rounded-md hover:bg-gray-50"
          >
            Volver al listado
          </Link>
          <ChargeIndividualForm condominiumId={condominiumId} expenseItems={expenseItemsOptions} units={unitsOptions} />
        </div>
      </div>

      {/* Quick navigation */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Ir a:</span>
        <a href="#expensas" className="text-purple-600 hover:underline font-medium">Expensas Mensuales</a>
        <span className="text-gray-300">•</span>
        <a href="#servicios" className="text-purple-600 hover:underline font-medium">Servicios Básicos</a>
      </div>

      <ChargeWizardExpensas
        condominiumId={condominiumId}
        rubrosIngreso={rubros}
        metodoDistribucion={metodo}
        unidadesBase={unidadesBase}
      />

      <ChargeWizardServicios
        condominiumId={condominiumId}
        rubrosIngreso={rubros}
        unidadesBase={unidadesBase}
      />
    </div>
  );
}

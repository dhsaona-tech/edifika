import { getFinancialAccounts } from "../financial-accounts/actions";
import { listReconciliations } from "./actions";
import ReconciliationPageClient from "./components/ReconciliationPageClient";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
  searchParams: { reconciliationId?: string } | Promise<{ reconciliationId?: string }>;
};

export default async function ReconciliationPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const condominiumId = resolvedParams.id;
  const accounts = await getFinancialAccounts(condominiumId, { state: "active" });
  const reconciliations = await listReconciliations(condominiumId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conciliación Bancaria</h1>
        <p className="text-sm text-muted-foreground">
          Selecciona los movimientos que ya aparecen en tu extracto bancario para conciliar.
        </p>
      </div>

      <ReconciliationPageClient
        condominiumId={condominiumId}
        accounts={accounts}
        reconciliations={reconciliations as any}
        initialReconciliationId={resolvedSearchParams.reconciliationId}
      />
    </div>
  );
}

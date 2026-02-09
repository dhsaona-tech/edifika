import { getFinancialAccounts } from "./actions";
import FinancialAccountFilters from "./components/FinancialAccountFilters";
import FinancialAccountsTable from "./components/FinancialAccountsTable";
import FinancialAccountForm from "./components/FinancialAccountForm";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?: { q?: string; type?: string; state?: string } | Promise<{ q?: string; type?: string; state?: string }>;
};

export default async function FinancialAccountsPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  const condominiumId = resolvedParams.id;
  const accounts = await getFinancialAccounts(condominiumId, {
    q: resolvedSearch?.q,
    type: resolvedSearch?.type,
    state: resolvedSearch?.state || "active",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cajas y Bancos</h1>
          <p className="text-sm text-muted-foreground">
            Control de cuentas financieras y activacion opcional de cheques.
          </p>
        </div>
        <FinancialAccountForm condominiumId={condominiumId} />
      </div>

      <FinancialAccountFilters />

      <FinancialAccountsTable accounts={accounts} condominiumId={condominiumId} />
    </div>
  );
}

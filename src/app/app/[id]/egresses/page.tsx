import Link from "next/link";
import { listEgresses } from "./actions";
import EgressesFilters from "./components/EgressesFilters";
import EgressesTable from "./components/EgressesTable";
import { getFinancialAccounts } from "../payables/actions";
import { getSuppliersBasic } from "../payables/actions";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?:
    | {
        status?: string;
        accountId?: string;
        supplierId?: string;
        method?: string;
        from?: string;
        to?: string;
        date?: string;
        search?: string;
      }
    | Promise<{
        status?: string;
        accountId?: string;
        supplierId?: string;
        method?: string;
        from?: string;
        to?: string;
        date?: string;
        search?: string;
      }>;
};

export default async function EgressesPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const condominiumId = resolvedParams.id;

  const filters = {
    status: resolvedSearch?.status,
    accountId: resolvedSearch?.accountId,
    supplierId: resolvedSearch?.supplierId,
    method: resolvedSearch?.method,
    date: resolvedSearch?.date,
    search: resolvedSearch?.search,
  };

  const [egresses, suppliers, accounts] = await Promise.all([
    listEgresses(condominiumId, filters),
    getSuppliersBasic(condominiumId),
    getFinancialAccounts(condominiumId),
  ]);

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name || "Proveedor" }));
  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: a.bank_name ? `${a.bank_name} - ${a.account_number}` : a.account_number || "Cuenta",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Egresos</h1>
          <p className="text-sm text-gray-500">Pagos salientes y asignacion a OP.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/app/${condominiumId}/payables/pay`}
            className="inline-flex items-center gap-2 rounded-md bg-brand text-white px-4 py-2 text-xs font-semibold shadow-sm hover:bg-brand-dark"
          >
            Registrar egreso
          </Link>
        </div>
      </div>

      <EgressesFilters suppliers={supplierOptions} accounts={accountOptions} />
      <EgressesTable egresses={egresses} condominiumId={condominiumId} />
    </div>
  );
}

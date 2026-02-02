import Link from "next/link";
import { listarPayments, getFinancialAccounts, getIncomeExpenseItems, getUnitsBasic } from "./actions";
import PaymentsTable from "./components/PaymentsTable";
import PaymentsFilters from "./components/PaymentsFilters";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?:
    | {
        status?: string;
        method?: string;
        accountId?: string;
        unitId?: string;
        expenseItemId?: string;
        from?: string;
        to?: string;
      }
    | Promise<{
        status?: string;
        method?: string;
        accountId?: string;
        unitId?: string;
        expenseItemId?: string;
        from?: string;
        to?: string;
      }>;
};

export default async function PaymentsPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const condominiumId = resolvedParams.id;

  const filters = {
    status: resolvedSearch?.status as "disponible" | "cancelado" | undefined,
    method: resolvedSearch?.method,
    accountId: resolvedSearch?.accountId,
    unitId: resolvedSearch?.unitId,
    expenseItemId: resolvedSearch?.expenseItemId,
    from: resolvedSearch?.from,
    to: resolvedSearch?.to,
  };

  const [payments, accounts, rubros, units] = await Promise.all([
    listarPayments(condominiumId, filters),
    getFinancialAccounts(condominiumId),
    getIncomeExpenseItems(condominiumId),
    getUnitsBasic(condominiumId),
  ]);

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: a.bank_name || "Cuenta",
  }));
  const rubroOptions = rubros.map((r) => ({ value: r.id, label: r.name }));
  const unitOptions = units.map((u) => ({
    value: u.id,
    label: u.full_identifier || u.identifier || "Unidad",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ingresos (pagos)</h1>
          <p className="text-sm text-gray-500">Control de pagos recibidos y su aplicacion a cargos.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/app/${condominiumId}/payment-reports`}
            className="inline-flex items-center gap-2 rounded-md bg-slate-200 text-gray-800 px-4 py-2 text-xs font-semibold shadow-sm hover:bg-slate-300"
          >
            Reportes de pago
          </Link>
          <Link
            href={`/app/${condominiumId}/payments/new`}
            className="inline-flex items-center gap-2 rounded-md bg-brand text-white px-4 py-2 text-xs font-semibold shadow-sm hover:bg-brand-dark"
          >
            Nuevo ingreso
          </Link>
        </div>
      </div>

      <PaymentsFilters
        accounts={accountOptions}
        units={unitOptions}
        rubros={rubroOptions}
      />

      <PaymentsTable payments={payments} condominiumId={condominiumId} />
    </div>
  );
}

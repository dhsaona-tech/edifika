import Link from "next/link";
import { listPayables, getExpenseItemsGasto, getSuppliersBasic } from "./actions";
import PayablesTable from "./components/PayablesTable";
import PayablesFilters from "./components/PayablesFilters";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?:
    | {
        status?: string;
        supplierId?: string;
        expenseItemId?: string;
        from?: string;
        to?: string;
        search?: string;
      }
    | Promise<{
        status?: string;
        supplierId?: string;
        expenseItemId?: string;
        from?: string;
        to?: string;
        search?: string;
      }>;
};

export default async function PayablesPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const condominiumId = resolvedParams.id;

  const filters = {
    status: resolvedSearch?.status as any,
    supplierId: resolvedSearch?.supplierId,
    expenseItemId: resolvedSearch?.expenseItemId,
    from: resolvedSearch?.from,
    to: resolvedSearch?.to,
    search: resolvedSearch?.search,
  };

  const [payables, suppliers, expenseItems] = await Promise.all([
    listPayables(condominiumId, filters),
    getSuppliersBasic(condominiumId),
    getExpenseItemsGasto(condominiumId),
  ]);

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name || "Proveedor" }));
  const expenseOptions = expenseItems.map((r) => ({ value: r.id, label: r.name || "Rubro" }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cuentas por pagar</h1>
          <p className="text-sm text-gray-500">Ordenes de pago con facturas y estado de egresos.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/app/${condominiumId}/payables/pay`}
            className="inline-flex items-center gap-2 rounded-md bg-slate-200 text-gray-800 px-4 py-2 text-xs font-semibold shadow-sm hover:bg-slate-300"
          >
            Registrar pago
          </Link>
          <Link
            href={`/app/${condominiumId}/payables/new`}
            className="inline-flex items-center gap-2 rounded-md bg-brand text-white px-4 py-2 text-xs font-semibold shadow-sm hover:bg-brand-dark"
          >
            Nueva OP
          </Link>
        </div>
      </div>

      <PayablesFilters suppliers={supplierOptions} expenseItems={expenseOptions} />

      <PayablesTable payables={payables} condominiumId={condominiumId} />
    </div>
  );
}

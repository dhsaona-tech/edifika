import { getExpenseItems, getSuppliers } from "./actions";
import SupplierFilters from "./components/SupplierFilters";
import SuppliersTable from "./components/SuppliersTable";
import SupplierModal from "./components/SupplierModal";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?:
    | {
        q?: string;
        state?: "active" | "inactive" | "all";
        expenseItemId?: string;
        fiscalId?: string;
      }
    | Promise<{
        q?: string;
        state?: "active" | "inactive" | "all";
        expenseItemId?: string;
        fiscalId?: string;
      }>;
};

export default async function SuppliersPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const condominiumId = resolvedParams.id;
  const query = typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q : undefined;
  const expenseItemIdFilter =
    typeof resolvedSearchParams?.expenseItemId === "string"
      ? resolvedSearchParams.expenseItemId
      : undefined;
  const fiscalIdFilter =
    typeof resolvedSearchParams?.fiscalId === "string" ? resolvedSearchParams.fiscalId : undefined;

  // Estado por defecto: activos; si viene "all" no se filtra; si viene "inactive" se filtra inactivos.
  const activeFilter =
    resolvedSearchParams?.state === "inactive"
      ? "inactive"
      : resolvedSearchParams?.state === "all"
      ? undefined
      : "active";

  const [suppliers, expenseItems] = await Promise.all([
    getSuppliers(condominiumId, query, activeFilter, expenseItemIdFilter, fiscalIdFilter),
    getExpenseItems(condominiumId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Proveedores</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los proveedores del condominio y su rubro principal.
          </p>
        </div>
        <SupplierModal condominiumId={condominiumId} expenseItems={expenseItems} />
      </div>

      <div className="grid gap-4">
        <SupplierFilters expenseItems={expenseItems} condominiumId={condominiumId} />

        <SuppliersTable
          suppliers={suppliers}
          condominiumId={condominiumId}
          expenseItems={expenseItems}
        />
      </div>
    </div>
  );
}

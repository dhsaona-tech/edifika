import { getFinancialAccounts, getSuppliersBasic } from "../actions";
import PayPayablesPage from "../components/PayPayablesPage";

type PageProps = { params: { id: string } | Promise<{ id: string }> };

export default async function PayPayablesRoute({ params }: PageProps) {
  const resolvedParams = await params;
  const condominiumId = resolvedParams.id;

  const [suppliers, accounts] = await Promise.all([
    getSuppliersBasic(condominiumId),
    getFinancialAccounts(condominiumId),
  ]);

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name || "Proveedor" }));

  // Pasamos la info completa de cuentas para saber si usan cheques
  const accountsWithCheckInfo = accounts.map((a) => ({
    value: a.id,
    label: a.bank_name ? `${a.bank_name} - ${a.account_number}` : a.account_number || "Cuenta",
    usesChecks: a.uses_checks || false,
    accountType: a.account_type,
  }));

  return (
    <div className="space-y-6">
      <PayPayablesPage
        condominiumId={condominiumId}
        suppliers={supplierOptions}
        accounts={accountsWithCheckInfo}
      />
    </div>
  );
}

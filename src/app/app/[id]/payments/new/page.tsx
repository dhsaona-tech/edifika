import RegisterPaymentPage from "../components/RegisterPaymentPage";
import { getFinancialAccounts, getUnitsBasic } from "../actions";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

export default async function NewPaymentPage({ params }: PageProps) {
  const resolvedParams = await params;
  const condominiumId = resolvedParams.id;

  const [accounts, units] = await Promise.all([
    getFinancialAccounts(condominiumId),
    getUnitsBasic(condominiumId),
  ]);

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.bank_name || "Cuenta"}${a.account_number ? ` - ${a.account_number}` : ""}`,
  }));
  const unitOptions = units.map((u) => ({
    value: u.id,
    label: u.full_identifier || u.identifier || "Unidad",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      </div>
      <RegisterPaymentPage condominiumId={condominiumId} accounts={accountOptions} units={unitOptions} />
    </div>
  );
}

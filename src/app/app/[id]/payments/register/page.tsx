import RegisterPaymentPage from "../components/RegisterPaymentPage";
import { getFinancialAccounts, getUnitsBasic } from "../actions";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

export default async function RegisterPayment({ params }: PageProps) {
  const resolvedParams = await params;
  const condominiumId = resolvedParams.id;

  const [accounts, units] = await Promise.all([
    getFinancialAccounts(condominiumId),
    getUnitsBasic(condominiumId),
  ]);

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: a.bank_name || "Cuenta",
  }));
  const unitOptions = units.map((u) => ({
    value: u.id,
    label: u.full_identifier || u.identifier || "Unidad",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Registrar cobro</h1>
          <p className="text-sm text-gray-500">
            Selecciona la unidad, marca las deudas y registra el pago con su cuenta de ingreso.
          </p>
        </div>
      </div>

      <RegisterPaymentPage condominiumId={condominiumId} accounts={accountOptions} units={unitOptions} />
    </div>
  );
}

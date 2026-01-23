import Link from "next/link";
import PaymentReportsTable from "./components/PaymentReportsTable";
import { getFinancialAccounts, listPendingReports } from "../payments/actions";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

export default async function PaymentReportsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const condominiumId = resolvedParams.id;

  const [reports, accounts] = await Promise.all([
    listPendingReports(condominiumId),
    getFinancialAccounts(condominiumId),
  ]);

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name || "Cuenta" }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reportes de pago</h1>
          <p className="text-sm text-gray-500">Aprueba o rechaza reportes enviados por residentes.</p>
        </div>
        <Link
          href={`/app/${condominiumId}/payments`}
          className="text-sm font-semibold text-brand hover:text-brand-dark"
        >
          Volver a ingresos
        </Link>
      </div>

      <PaymentReportsTable reports={reports} accounts={accountOptions} condominiumId={condominiumId} />
    </div>
  );
}

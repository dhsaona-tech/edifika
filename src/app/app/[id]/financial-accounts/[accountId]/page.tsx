import { getFinancialAccountById, getCheckbooks, getChecks } from "../actions";
import CheckbooksTab from "./components/CheckbooksTab";
import ChecksTab from "./components/ChecksTab";
import BackButton from "@/components/ui/BackButton";
import { formatCurrency } from "@/lib/utils";

type PageProps = { params: { id: string; accountId: string } | Promise<{ id: string; accountId: string }> };

export default async function FinancialAccountDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id: condominiumId, accountId } = resolvedParams;
  const account = await getFinancialAccountById(condominiumId, accountId);
  if (!account) return <div className="text-sm text-gray-500">Cuenta no encontrada</div>;

  const [checkbooks, checks] =
    account.uses_checks && account.account_type === "corriente"
      ? await Promise.all([getCheckbooks(condominiumId, accountId), getChecks(condominiumId, accountId)])
      : [[], []];

  const showChecks = account.account_type === "corriente" && account.uses_checks;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton href={`/app/${condominiumId}/financial-accounts`} />
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Cuenta financiera</p>
            <h1 className="text-2xl font-semibold text-gray-900">{account.bank_name}</h1>
            <p className="text-sm text-gray-500">{account.account_number}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          label="Tipo"
          value={
            account.account_type === "corriente"
              ? "Cuenta corriente"
              : account.account_type === "ahorros"
              ? "Cuenta de ahorros"
              : "Caja chica"
          }
        />
        <Card
          label="Saldo inicial"
          value={formatCurrency(account.initial_balance)}
        />
        <Card
          label="Saldo actual"
          value={formatCurrency(account.current_balance)}
          highlight
        />
        <Card label="Cheques" value={showChecks ? "Gestion activa" : "No usa cheques"} muted={!showChecks} />
      </div>

      {showChecks ? (
        <div className="grid grid-cols-1 gap-6">
          <CheckbooksTab condominiumId={condominiumId} accountId={accountId} checkbooks={checkbooks} />
          <ChecksTab condominiumId={condominiumId} checks={checks} />
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-sm">
          Esta cuenta no tiene gestion de cheques activa. Puedes habilitarla editando la cuenta (solo para cuentas corrientes).
        </div>
      )}
    </div>
  );
}

function Card({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 shadow-sm ${
        highlight ? "bg-gradient-to-br from-brand/5 to-white border-brand/20" : "bg-white border-gray-200"
      } ${muted ? "text-gray-500" : ""}`}
    >
      <p className="text-[11px] uppercase font-semibold text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

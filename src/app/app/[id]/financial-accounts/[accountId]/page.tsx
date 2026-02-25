import { getFinancialAccountById, getCheckbooks, getChecks, getAccountMovements } from "../actions";
import {
  getPettyCashVouchers,
  getExpenseItemsForVouchers,
  getBankAccountsForReplenishment,
  getPettyCashSummary,
} from "../petty-cash-actions";
import CheckbooksTab from "./components/CheckbooksTab";
import ChecksTab from "./components/ChecksTab";
import MovementsTab from "./components/MovementsTab";
import FundPettyCashButton from "./components/FundPettyCashButton";
import AddExpenseButton from "./components/AddExpenseButton";
import PettyCashReport from "./components/PettyCashReport";
import SimplePettyCashExpenses from "./components/SimplePettyCashExpenses";
import AdjustBalanceForm from "../components/AdjustBalanceForm";
import BackButton from "@/components/ui/BackButton";
import { formatCurrency } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown, Receipt } from "lucide-react";

type PageProps = { params: { id: string; accountId: string } | Promise<{ id: string; accountId: string }> };

export default async function FinancialAccountDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id: condominiumId, accountId } = resolvedParams;
  const account = await getFinancialAccountById(condominiumId, accountId);
  if (!account) return <div className="text-sm text-gray-500">Cuenta no encontrada</div>;

  const isPettyCash = account.account_type === "caja_chica";
  const showChecks = account.account_type === "corriente" && account.uses_checks;

  // Cargar datos según el tipo de cuenta
  const [
    checkbooks,
    checks,
    movements,
    vouchers,
    expenseItems,
    bankAccounts,
    pettyCashSummary,
  ] = await Promise.all([
    // Chequeras y cheques solo para cuentas corrientes
    showChecks ? getCheckbooks(condominiumId, accountId) : Promise.resolve([]),
    showChecks ? getChecks(condominiumId, accountId) : Promise.resolve([]),
    // Movimientos para todas las cuentas
    getAccountMovements(condominiumId, accountId, { limit: 50 }),
    // Vales y datos de caja chica
    isPettyCash ? getPettyCashVouchers(condominiumId, accountId) : Promise.resolve([]),
    isPettyCash ? getExpenseItemsForVouchers(condominiumId) : Promise.resolve([]),
    isPettyCash ? getBankAccountsForReplenishment(condominiumId) : Promise.resolve([]),
    isPettyCash ? getPettyCashSummary(condominiumId, accountId) : Promise.resolve(null),
  ]);

  // Datos simplificados de caja chica
  const availableBalance = Number(account.current_balance || 0);
  const totalExpenses = vouchers
    .filter((v) => v.status !== "anulado")
    .reduce((sum, v) => sum + Number(v.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton href={`/app/${condominiumId}/financial-accounts`} />
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">
              {isPettyCash ? "Caja chica" : "Cuenta financiera"}
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">{account.bank_name}</h1>
            {!isPettyCash && <p className="text-sm text-gray-500">{account.account_number}</p>}
            {isPettyCash && account.custodian?.full_name && (
              <p className="text-sm text-gray-500">Custodio: {account.custodian.full_name}</p>
            )}
          </div>
        </div>

        {/* Acciones según tipo de cuenta */}
        {isPettyCash ? (
          <div className="flex items-center gap-2">
            <PettyCashReport
              condominiumId={condominiumId}
              accountId={accountId}
              accountName={account.bank_name}
            />
            <AddExpenseButton
              condominiumId={condominiumId}
              accountId={accountId}
              availableBalance={availableBalance}
              expenseItems={expenseItems}
            />
            <FundPettyCashButton
              condominiumId={condominiumId}
              pettyCashAccountId={accountId}
              pettyCashName={account.bank_name}
              bankAccounts={bankAccounts}
            />
          </div>
        ) : (
          <AdjustBalanceForm
            condominiumId={condominiumId}
            accountId={accountId}
            accountName={account.bank_name}
            currentBalance={account.current_balance || 0}
          />
        )}
      </div>

      {/* Cards de información - diferente para caja chica */}
      {isPettyCash ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Saldo disponible - destacado */}
          <div className="md:col-span-2 bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Wallet className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 uppercase font-semibold">Saldo Disponible</p>
                <p className="text-3xl font-bold text-emerald-800">{formatCurrency(availableBalance)}</p>
              </div>
            </div>
          </div>

          {/* Total ingresado */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-500 uppercase font-semibold">Total Ingresado</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(pettyCashSummary?.totalFunded || Number(account.initial_balance || 0))}
            </p>
          </div>

          {/* Total gastado */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-gray-500 uppercase font-semibold">Total Gastado</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-gray-500">{vouchers.filter(v => v.status !== "anulado").length} comprobante(s)</p>
          </div>
        </div>
      ) : (
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
          <Card label="Cheques" value={showChecks ? "Gestión activa" : "No usa cheques"} muted={!showChecks} />
        </div>
      )}

      {/* Lista de gastos/comprobantes para caja chica */}
      {isPettyCash && (
        <SimplePettyCashExpenses
          vouchers={vouchers}
          condominiumId={condominiumId}
          accountId={accountId}
        />
      )}

      {/* Movimientos - siempre visible */}
      <MovementsTab
        movements={movements}
        condominiumId={condominiumId}
        accountId={accountId}
      />

      {/* Cheques - solo para cuentas corrientes con cheques */}
      {showChecks && (
        <div className="grid grid-cols-1 gap-6">
          <CheckbooksTab condominiumId={condominiumId} accountId={accountId} checkbooks={checkbooks} />
          <ChecksTab condominiumId={condominiumId} checks={checks} />
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

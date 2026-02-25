import { getFinancialAccounts } from "./actions";
import FinancialAccountFilters from "./components/FinancialAccountFilters";
import FinancialAccountsTable from "./components/FinancialAccountsTable";
import FinancialAccountForm from "./components/FinancialAccountForm";
import PettyCashForm from "./components/PettyCashForm";
import TransferForm from "./components/TransferForm";
import { formatCurrency } from "@/lib/utils";
import { Landmark, Wallet, Building2 } from "lucide-react";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?: { q?: string; type?: string; state?: string } | Promise<{ q?: string; type?: string; state?: string }>;
};

export default async function FinancialAccountsPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  const condominiumId = resolvedParams.id;
  const accounts = await getFinancialAccounts(condominiumId, {
    q: resolvedSearch?.q,
    type: resolvedSearch?.type,
    state: resolvedSearch?.state || "active",
  });

  // Calcular totales
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  const activeAccounts = accounts.filter((acc) => acc.is_active);
  const bankAccounts = accounts.filter((acc) => acc.account_type !== "caja_chica");
  const pettyCashAccounts = accounts.filter((acc) => acc.account_type === "caja_chica");

  // Saldo total de bancos (sin caja chica)
  const bankBalance = bankAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  const pettyCashBalance = pettyCashAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cajas y Bancos</h1>
          <p className="text-sm text-muted-foreground">
            Control de cuentas bancarias y cajas chicas del condominio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeAccounts.length >= 2 && (
            <TransferForm condominiumId={condominiumId} accounts={activeAccounts} />
          )}
          <PettyCashForm condominiumId={condominiumId} />
          <FinancialAccountForm condominiumId={condominiumId} />
        </div>
      </div>

      {/* Resumen de saldos - Mejorado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-gray-100 rounded-lg">
              <Landmark className="w-4 h-4 text-gray-600" />
            </div>
            <p className="text-[11px] uppercase font-semibold text-gray-500">Total disponible</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-brand/10 rounded-lg">
              <Building2 className="w-4 h-4 text-brand" />
            </div>
            <p className="text-[11px] uppercase font-semibold text-gray-500">En bancos</p>
          </div>
          <p className="text-xl font-bold text-brand">{formatCurrency(bankBalance)}</p>
          <p className="text-[10px] text-gray-400">{bankAccounts.length} cuenta(s)</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <Wallet className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-[11px] uppercase font-semibold text-gray-500">En cajas chicas</p>
          </div>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(pettyCashBalance)}</p>
          <p className="text-[10px] text-gray-400">{pettyCashAccounts.length} caja(s)</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          <p className="text-[11px] uppercase font-semibold text-gray-500 mb-1">Cuentas activas</p>
          <p className="text-xl font-bold text-gray-900">{activeAccounts.length}</p>
          <p className="text-[10px] text-gray-400">de {accounts.length} registradas</p>
        </div>
      </div>

      <FinancialAccountFilters />

      <FinancialAccountsTable accounts={accounts} condominiumId={condominiumId} />
    </div>
  );
}

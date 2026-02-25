import Link from "next/link";
import { getFinancialAccounts, listUnidentifiedPayments, getUnitsBasic } from "../actions";
import UnidentifiedPaymentsTable from "./components/UnidentifiedPaymentsTable";
import CreateUnidentifiedButton from "./components/CreateUnidentifiedButton";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

export default async function UnidentifiedPaymentsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const condominiumId = resolvedParams.id;

  const [payments, accounts, units] = await Promise.all([
    listUnidentifiedPayments(condominiumId),
    getFinancialAccounts(condominiumId),
    getUnitsBasic(condominiumId),
  ]);

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.bank_name || "Cuenta"} · ${a.account_number || ""}`.trim()
  }));

  const unitOptions = units.map((u) => ({
    value: u.id,
    label: u.full_identifier || u.identifier || u.id,
  }));

  const pending = payments.filter((p) => p.status === "pendiente");
  const assigned = payments.filter((p) => p.status === "asignado");
  const returned = payments.filter((p) => p.status === "devuelto");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ingresos no identificados</h1>
          <p className="text-sm text-gray-500">
            Depósitos/transferencias que aparecen en el banco pero no se sabe a qué unidad pertenecen.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/app/${condominiumId}/payments`}
            className="text-sm font-semibold text-brand hover:text-brand-dark"
          >
            ← Volver a ingresos
          </Link>
          <CreateUnidentifiedButton
            condominiumId={condominiumId}
            accounts={accountOptions}
          />
        </div>
      </div>

      {/* Pendientes */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">Pendientes de asignar</h2>
          <span className="ml-auto text-sm text-gray-500">{pending.length} registros</span>
        </div>
        <UnidentifiedPaymentsTable
          payments={pending}
          condominiumId={condominiumId}
          units={unitOptions}
          showAssignAction
        />
      </div>

      {/* Asignados */}
      {assigned.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <h2 className="text-lg font-semibold text-gray-900">Asignados</h2>
            <span className="ml-auto text-sm text-gray-500">{assigned.length} registros</span>
          </div>
          <UnidentifiedPaymentsTable
            payments={assigned}
            condominiumId={condominiumId}
            units={unitOptions}
          />
        </div>
      )}

      {/* Devueltos */}
      {returned.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Devueltos</h2>
            <span className="ml-auto text-sm text-gray-500">{returned.length} registros</span>
          </div>
          <UnidentifiedPaymentsTable
            payments={returned}
            condominiumId={condominiumId}
            units={unitOptions}
          />
        </div>
      )}
    </div>
  );
}

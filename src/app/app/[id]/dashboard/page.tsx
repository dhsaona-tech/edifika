import Link from "next/link";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { getDashboardMetrics } from "./actions";
import { formatCurrency } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardPage({ params }: PageProps) {
  const { id } = await params;
  const metrics = await getDashboardMetrics(id);

  const netIncome = metrics.financial.monthlyIncome - metrics.financial.monthlyExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen general del condominio</p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Unidades */}
        <Link
          href={`/app/${id}/units`}
          className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidades</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.units.active}</p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.units.withDebt} con deuda pendiente
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-brand" />
            </div>
          </div>
        </Link>

        {/* Residentes */}
        <Link
          href={`/app/${id}/residents`}
          className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Residentes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.residents.total}</p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.residents.owners} propietarios, {metrics.residents.tenants} inquilinos
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Link>

        {/* Deuda Pendiente */}
        <Link
          href={`/app/${id}/charges`}
          className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Deuda Pendiente
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(metrics.financial.totalDebt)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.financial.pendingCharges} cargos pendientes
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Link>

        {/* Balance de Cuentas */}
        <Link
          href={`/app/${id}/financial-accounts`}
          className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Balance Total
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(metrics.financial.accountBalance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">En cuentas activas</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Link>
      </div>

      {/* Finanzas del mes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ingresos y Egresos */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Finanzas del Mes</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Ingresos</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {formatCurrency(metrics.financial.monthlyIncome)}
                  </p>
                </div>
              </div>
              <Link
                href={`/app/${id}/payments`}
                className="text-xs font-semibold text-green-600 hover:underline"
              >
                Ver todos →
              </Link>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Egresos</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {formatCurrency(metrics.financial.monthlyExpenses)}
                  </p>
                </div>
              </div>
              <Link
                href={`/app/${id}/egresses`}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Ver todos →
              </Link>
            </div>

            <div
              className={`flex items-center justify-between p-4 rounded-lg border ${
                netIncome >= 0
                  ? "bg-blue-50 border-blue-200"
                  : "bg-orange-50 border-orange-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    netIncome >= 0 ? "bg-blue-100" : "bg-orange-100"
                  }`}
                >
                  {netIncome >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Resultado Neto</p>
                  <p
                    className={`text-xl font-bold mt-1 ${
                      netIncome >= 0 ? "text-blue-900" : "text-orange-900"
                    }`}
                  >
                    {formatCurrency(netIncome)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
          <div className="space-y-3">
            <Link
              href={`/app/${id}/payments`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ArrowDownLeft className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Pagos registrados</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{metrics.recentActivity.recentPayments}</span>
            </Link>

            <Link
              href={`/app/${id}/charges`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Cargos generados</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{metrics.recentActivity.recentCharges}</span>
            </Link>

            <Link
              href={`/app/${id}/payables`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Cuentas por pagar</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {metrics.recentActivity.pendingPayables}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href={`/app/${id}/charges/generate`}
            className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
          >
            <FileText className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-xs font-semibold text-gray-700 text-center">Generar Expensas</span>
          </Link>

          <Link
            href={`/app/${id}/payments/new`}
            className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
          >
            <ArrowDownLeft className="w-6 h-6 text-green-600 mb-2" />
            <span className="text-xs font-semibold text-gray-700 text-center">Registrar Pago</span>
          </Link>

          <Link
            href={`/app/${id}/payables/new`}
            className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
          >
            <CreditCard className="w-6 h-6 text-orange-600 mb-2" />
            <span className="text-xs font-semibold text-gray-700 text-center">Nueva Cuenta por Pagar</span>
          </Link>

          <Link
            href={`/app/${id}/budget`}
            className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <Wallet className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-xs font-semibold text-gray-700 text-center">Presupuesto</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

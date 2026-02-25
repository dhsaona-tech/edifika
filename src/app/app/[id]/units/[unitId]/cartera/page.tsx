import { getCarteraData } from "@/lib/cartera/getCarteraData";
import { ArrowLeft, Calendar, DollarSign, AlertTriangle, CheckCircle, Clock, CreditCard, FileText, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import CarteraFilters from "./components/CarteraFilters";
import PrintButton from "./components/PrintButton";

interface PageProps {
  params: Promise<{ id: string; unitId: string }>;
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}

const paymentMethodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  cheque: "Cheque",
  deposito: "Depósito",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

const chargeTypeLabels: Record<string, string> = {
  expensa_mensual: "Expensa",
  servicio_basico: "Servicio",
  extraordinaria_masiva: "Extraordinaria",
  saldo_inicial: "Saldo Inicial",
  multa: "Multa",
  reserva: "Reserva",
  interest: "Mora",
  otro: "Otro",
};

const statusStyles: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  pagado: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    icon: <CheckCircle size={14} className="text-green-600" />,
  },
  parcial: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: <Clock size={14} className="text-amber-600" />,
  },
  pendiente: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: <Clock size={14} className="text-amber-600" />,
  },
  vencido: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    icon: <AlertTriangle size={14} className="text-red-600" />,
  },
};

const statusLabels: Record<string, string> = {
  pagado: "Pagado",
  parcial: "Pago Parcial",
  pendiente: "Pendiente",
  vencido: "Vencido",
};

export default async function CarteraPage({ params, searchParams }: PageProps) {
  const { id: condominiumId, unitId } = await params;
  const filters = await searchParams;

  const cartera = await getCarteraData(condominiumId, unitId, filters);
  if (!cartera) return notFound();

  const { unit, owner, condominium, summary, periods, payments } = cartera;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/app/${condominiumId}/units/${unitId}`}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Estado de Cuenta
            </h1>
            <p className="text-sm text-gray-500">
              {unit.full_identifier || `${unit.type} ${unit.identifier}`} • {owner.full_name}
            </p>
          </div>
        </div>

        <PrintButton
          condominiumId={condominiumId}
          unitId={unitId}
          filters={filters}
        />
      </div>

      {/* Filtros */}
      <CarteraFilters condominiumId={condominiumId} unitId={unitId} currentFilters={filters} />

      {/* Resumen Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText size={16} className="text-blue-600" />
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Generado</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.total_charges)}</p>
          <p className="text-xs text-gray-500">{summary.charges_count} cargos</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle size={16} className="text-green-600" />
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Pagado</span>
          </div>
          <p className="text-xl font-bold text-green-600">{formatCurrency(summary.total_paid)}</p>
          <p className="text-xs text-gray-500">{summary.payments_count} pagos</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock size={16} className="text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Pendiente</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(summary.total_pending)}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${summary.total_overdue > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <AlertTriangle size={16} className={summary.total_overdue > 0 ? 'text-red-600' : 'text-gray-400'} />
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Vencido</span>
          </div>
          <p className={`text-xl font-bold ${summary.total_overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {formatCurrency(summary.total_overdue)}
          </p>
        </div>
      </div>

      {/* Saldo a favor */}
      {summary.credit_balance > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CreditCard size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">Saldo a Favor</p>
              <p className="text-xs text-emerald-600">Disponible para aplicar a futuros cargos</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.credit_balance)}</p>
        </div>
      )}

      {/* Vista por Periodos */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Calendar size={16} /> Detalle por Periodo
        </h2>

        {periods.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FileText size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-600 mb-2">Sin movimientos</h3>
            <p className="text-sm text-gray-500">No hay cargos ni pagos en el periodo seleccionado.</p>
          </div>
        ) : (
          periods.map((period) => {
            const style = statusStyles[period.status] || statusStyles.pendiente;

            return (
              <details
                key={period.period}
                className={`bg-white rounded-lg border overflow-hidden ${style.border}`}
                {...(period.status !== "pagado" ? { open: true } : {})}
              >
                <summary className={`${style.bg} px-4 py-3 cursor-pointer hover:brightness-95 transition-all`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronRight size={16} className="text-gray-400 details-chevron" />
                      <span className={`font-semibold ${style.text}`}>{period.period_label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text} border ${style.border}`}>
                        {style.icon}
                        <span className="ml-1">{statusLabels[period.status]}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <span className="text-gray-500 text-xs">Generado</span>
                        <p className="font-semibold text-gray-900">{formatCurrency(period.total_charged)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 text-xs">Pagado</span>
                        <p className="font-semibold text-green-600">{formatCurrency(period.total_paid)}</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <span className="text-gray-500 text-xs">Saldo</span>
                        <p className={`font-bold ${period.balance > 0.01 ? 'text-amber-600' : 'text-green-600'}`}>
                          {formatCurrency(period.balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                </summary>

                <div className="border-t divide-y divide-gray-100">
                  {/* Cargos del periodo */}
                  {period.charges.map((charge) => {
                    // Buscar pagos aplicados a este cargo específico
                    const chargePayments = payments.flatMap(p =>
                      p.allocations
                        .filter(a => a.charge_id === charge.id)
                        .map(a => ({
                          payment_id: p.id,
                          payment_date: p.payment_date,
                          folio_rec: p.folio_rec,
                          amount_allocated: a.amount_allocated,
                          payment_method: p.payment_method,
                          reference_number: p.reference_number,
                        }))
                    );

                    return (
                      <div key={charge.id} className="px-4 py-3">
                        {/* Línea del cargo */}
                        <div className={`flex items-center justify-between ${charge.is_overdue ? 'bg-red-50 -mx-4 px-4 py-2' : ''}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                              {chargeTypeLabels[charge.charge_type] || charge.charge_type}
                            </span>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {charge.expense_item_name || "Sin concepto"}
                              </p>
                              {charge.description && (
                                <p className="text-xs text-gray-500">{charge.description}</p>
                              )}
                            </div>
                            {charge.is_overdue && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold flex items-center gap-1">
                                <AlertTriangle size={10} /> {charge.days_overdue} días
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right min-w-[70px]">
                              <span className="text-xs text-gray-400">Monto</span>
                              <p className="font-semibold">{formatCurrency(charge.total_amount)}</p>
                            </div>
                            <div className="text-right min-w-[70px]">
                              <span className="text-xs text-gray-400">Pagado</span>
                              <p className="font-semibold text-green-600">{formatCurrency(charge.paid_amount)}</p>
                            </div>
                            <div className="text-right min-w-[70px]">
                              <span className="text-xs text-gray-400">Saldo</span>
                              <p className={`font-bold ${charge.balance > 0.01 ? 'text-amber-600' : 'text-green-600'}`}>
                                {formatCurrency(charge.balance)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Pagos aplicados a este cargo */}
                        {chargePayments.length > 0 && (
                          <div className="mt-2 ml-6 space-y-1">
                            {chargePayments.map((payment, idx) => (
                              <div
                                key={`${payment.payment_id}-${idx}`}
                                className="flex items-center justify-between text-xs bg-green-50 rounded px-3 py-1.5 border border-green-100"
                              >
                                <div className="flex items-center gap-2 text-green-700">
                                  <CheckCircle size={12} />
                                  <span>Pago recibido</span>
                                  {payment.folio_rec && (
                                    <Link
                                      href={`/app/${condominiumId}/payments/${payment.payment_id}`}
                                      className="font-mono font-bold text-green-800 hover:underline"
                                    >
                                      REC-{String(payment.folio_rec).padStart(6, "0")}
                                    </Link>
                                  )}
                                  <span className="text-green-600">
                                    {new Date(payment.payment_date).toLocaleDateString("es-EC")}
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-green-100 rounded text-green-700">
                                    {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                                  </span>
                                  {payment.reference_number && (
                                    <span className="text-green-600">Ref: {payment.reference_number}</span>
                                  )}
                                </div>
                                <span className="font-bold text-green-700">
                                  {formatCurrency(payment.amount_allocated)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Indicador si no hay pagos */}
                        {chargePayments.length === 0 && charge.status === "pendiente" && (
                          <div className="mt-2 ml-6 text-xs text-amber-600 flex items-center gap-1">
                            <Clock size={12} /> Sin pagos registrados
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })
        )}
      </div>

      <style>{`
        details[open] .details-chevron {
          transform: rotate(90deg);
        }
        details summary::-webkit-details-marker {
          display: none;
        }
        details summary {
          list-style: none;
        }
      `}</style>
    </div>
  );
}

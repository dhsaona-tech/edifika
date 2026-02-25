"use client";

import { useState, useTransition } from "react";
import { getPettyCashReportData, type PettyCashReportData } from "../../petty-cash-actions";
import { formatCurrency } from "@/lib/utils";
import { Printer, X, FileText, Download, Calendar } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

type Props = {
  condominiumId: string;
  accountId: string;
  accountName: string;
};

export default function PettyCashReport({ condominiumId, accountId, accountName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reportData, setReportData] = useState<PettyCashReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtros de fecha
  const today = new Date().toISOString().slice(0, 10);
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(today);

  const loadReport = () => {
    setError(null);
    startTransition(async () => {
      const data = await getPettyCashReportData(condominiumId, accountId, fromDate, toDate);
      if (!data) {
        setError("No se pudo cargar el reporte");
        return;
      }
      setReportData(data);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          loadReport();
        }}
        className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-gray-50 transition-colors"
      >
        <FileText size={16} />
        Ver Reporte
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - no se imprime */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand" />
                <h3 className="text-lg font-semibold text-gray-900">Reporte de Caja Chica</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filtros - no se imprimen */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 print:hidden">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    <Calendar size={12} className="inline mr-1" />
                    Desde
                  </label>
                  <DatePicker value={fromDate} onChange={setFromDate} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    <Calendar size={12} className="inline mr-1" />
                    Hasta
                  </label>
                  <DatePicker value={toDate} onChange={setToDate} />
                </div>
                <button
                  onClick={loadReport}
                  disabled={isPending}
                  className="px-4 py-2 bg-brand text-white rounded-md text-sm font-semibold hover:bg-brand-dark disabled:opacity-50"
                >
                  {isPending ? "Cargando..." : "Actualizar"}
                </button>
                <button
                  onClick={handlePrint}
                  disabled={!reportData}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-semibold hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
                >
                  <Printer size={16} />
                  Imprimir
                </button>
              </div>
            </div>

            {/* Contenido del reporte */}
            <div className="overflow-y-auto flex-1 p-6" id="printable-report">
              {isPending && !reportData && (
                <div className="text-center py-12 text-gray-500">Cargando reporte...</div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {reportData && (
                <div className="space-y-6">
                  {/* Encabezado del reporte */}
                  <div className="text-center border-b pb-4">
                    <h1 className="text-2xl font-bold text-gray-900">Reporte de Caja Chica</h1>
                    <h2 className="text-lg text-gray-700 mt-1">{reportData.account.name}</h2>
                    <p className="text-sm text-gray-500 mt-2">
                      Período: {formatDate(reportData.period.from)} - {formatDate(reportData.period.to)}
                    </p>
                    {reportData.account.custodian && (
                      <p className="text-sm text-gray-500">
                        Custodio: {reportData.account.custodian}
                      </p>
                    )}
                  </div>

                  {/* Resumen */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                      <p className="text-xs uppercase font-semibold text-emerald-600">Total Ingresos</p>
                      <p className="text-xl font-bold text-emerald-800">
                        {formatCurrency(reportData.totals.totalFundings)}
                      </p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                      <p className="text-xs uppercase font-semibold text-amber-600">Total Gastos</p>
                      <p className="text-xl font-bold text-amber-800">
                        {formatCurrency(reportData.totals.totalExpenses)}
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <p className="text-xs uppercase font-semibold text-blue-600">Saldo Actual</p>
                      <p className="text-xl font-bold text-blue-800">
                        {formatCurrency(reportData.totals.balance)}
                      </p>
                    </div>
                  </div>

                  {/* Tabla de Ingresos/Fondeos */}
                  {reportData.fundings.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Ingresos / Fondeos</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                            <tr>
                              <th className="px-4 py-2 text-left">Fecha</th>
                              <th className="px-4 py-2 text-left">Descripción</th>
                              <th className="px-4 py-2 text-right">Monto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {reportData.fundings.map((f, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-gray-700">{formatDate(f.date)}</td>
                                <td className="px-4 py-2 text-gray-700">{f.description}</td>
                                <td className="px-4 py-2 text-right font-semibold text-emerald-700">
                                  +{formatCurrency(f.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={2} className="px-4 py-2 font-semibold text-gray-700">
                                Total Ingresos
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-emerald-700">
                                {formatCurrency(reportData.totals.totalFundings)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tabla de Gastos/Comprobantes */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Gastos / Comprobantes ({reportData.expenses.length})
                    </h3>
                    {reportData.expenses.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                        No hay gastos registrados en este período
                      </p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                            <tr>
                              <th className="px-3 py-2 text-left">#</th>
                              <th className="px-3 py-2 text-left">Fecha</th>
                              <th className="px-3 py-2 text-left">Descripción</th>
                              <th className="px-3 py-2 text-left">Beneficiario</th>
                              <th className="px-3 py-2 text-left">Rubro</th>
                              <th className="px-3 py-2 text-right">Monto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {reportData.expenses.map((e, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-600 font-mono text-xs">
                                  {e.number.toString().padStart(4, "0")}
                                </td>
                                <td className="px-3 py-2 text-gray-700">{formatDate(e.date)}</td>
                                <td className="px-3 py-2 text-gray-700">{e.description}</td>
                                <td className="px-3 py-2 text-gray-600">{e.beneficiary || "-"}</td>
                                <td className="px-3 py-2 text-gray-600">{e.expenseItem || "-"}</td>
                                <td className="px-3 py-2 text-right font-semibold text-amber-700">
                                  -{formatCurrency(e.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={5} className="px-3 py-2 font-semibold text-gray-700">
                                Total Gastos
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-amber-700">
                                {formatCurrency(reportData.totals.totalExpenses)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Pie del reporte */}
                  <div className="border-t pt-4 mt-6 text-center text-xs text-gray-500">
                    <p>Reporte generado el {new Date().toLocaleDateString("es-EC", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}</p>
                  </div>

                  {/* Espacio para firmas */}
                  <div className="grid grid-cols-2 gap-8 mt-8 pt-4">
                    <div className="text-center">
                      <div className="border-t border-gray-400 pt-2 mt-12">
                        <p className="text-sm text-gray-600">Custodio</p>
                        <p className="text-xs text-gray-500">{reportData.account.custodian || "________________"}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="border-t border-gray-400 pt-2 mt-12">
                        <p className="text-sm text-gray-600">Administrador</p>
                        <p className="text-xs text-gray-500">________________</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report,
          #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

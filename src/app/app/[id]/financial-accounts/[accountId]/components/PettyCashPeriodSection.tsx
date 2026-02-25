"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  openPettyCashPeriod,
  closePettyCashPeriod,
  deletePettyCashPeriod,
  type PeriodStatus,
  type PettyCashPeriod,
} from "../../petty-cash-actions";
import { formatCurrency } from "@/lib/utils";
import {
  PlayCircle,
  StopCircle,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  Trash2,
} from "lucide-react";

type Props = {
  condominiumId: string;
  accountId: string;
  periodStatus: PeriodStatus | null;
  periods: PettyCashPeriod[];
  maxAmount: number;
};

export default function PettyCashPeriodSection({
  condominiumId,
  accountId,
  periodStatus,
  periods,
  maxAmount,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Datos de apertura
  const [openingAmount, setOpeningAmount] = useState(
    periodStatus?.suggested_opening?.toString() || maxAmount.toString()
  );

  // Datos de cierre
  const [physicalCash, setPhysicalCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  const hasOpenPeriod = periodStatus?.has_open_period ?? false;
  const currentPeriod = periodStatus?.period;
  const lastClosedPeriod = periodStatus?.last_closed_period;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleOpen = () => {
    setError(null);
    const amount = parseFloat(openingAmount);

    if (isNaN(amount) || amount <= 0) {
      setError("Ingresa un monto válido mayor a 0");
      return;
    }

    startTransition(async () => {
      const result = await openPettyCashPeriod(condominiumId, accountId, amount);

      if (result.error) {
        setError(result.error);
        return;
      }

      setShowOpenModal(false);
      setOpeningAmount(maxAmount.toString());
      router.refresh();
    });
  };

  const handleClose = () => {
    setError(null);
    const cash = parseFloat(physicalCash);

    if (isNaN(cash) || cash < 0) {
      setError("Ingresa el efectivo físico contado (puede ser 0)");
      return;
    }

    startTransition(async () => {
      const result = await closePettyCashPeriod(
        condominiumId,
        accountId,
        cash,
        closeNotes.trim() || undefined
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      setShowCloseModal(false);
      setPhysicalCash("");
      setCloseNotes("");

      // Actualizar monto sugerido para próxima apertura
      if (result.suggestedNextOpening) {
        setOpeningAmount(result.suggestedNextOpening.toString());
      }

      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!currentPeriod) return;

    startTransition(async () => {
      const result = await deletePettyCashPeriod(condominiumId, currentPeriod.id);

      if (result.error) {
        setError(result.error);
        return;
      }

      setShowDeleteModal(false);
      setError(null);
      router.refresh();
    });
  };

  // Verificar si se puede eliminar el período (solo si no tiene comprobantes)
  const canDeletePeriod = hasOpenPeriod && currentPeriod && currentPeriod.vouchers_count === 0;

  // Calcular diferencia en tiempo real para el modal de cierre
  const calculateDifference = () => {
    if (!currentPeriod || !physicalCash) return null;
    const cash = parseFloat(physicalCash);
    if (isNaN(cash)) return null;

    const expected = currentPeriod.expected_cash;
    const diff = cash - expected;

    return {
      expected,
      actual: cash,
      difference: diff,
      type: diff > 0 ? "sobrante" : diff < 0 ? "faltante" : "exacto",
      suggestedNext:
        diff > 0
          ? currentPeriod.total_vouchers // Solo reponer lo gastado
          : diff < 0
          ? maxAmount + Math.abs(diff) // Reponer + devolver al custodio
          : maxAmount, // Reponer todo
    };
  };

  const diffCalc = calculateDifference();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Período de Caja</h3>
          <p className="text-sm text-gray-500">
            {hasOpenPeriod
              ? `Período #${currentPeriod?.period_number} abierto`
              : "Sin período abierto"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm"
          >
            <History size={16} />
            Historial
          </button>
          {hasOpenPeriod ? (
            <div className="flex items-center gap-2">
              {canDeletePeriod && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-1.5 text-gray-500 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-colors"
                  title="Eliminar período vacío"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              )}
              <button
                onClick={() => setShowCloseModal(true)}
                className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-red-700"
              >
                <StopCircle size={16} />
                Cerrar Caja
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-emerald-700"
            >
              <PlayCircle size={16} />
              Abrir Caja
            </button>
          )}
        </div>
      </div>

      {/* Estado del período actual */}
      {hasOpenPeriod && currentPeriod && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-emerald-100 rounded-full">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="font-medium text-emerald-800">Caja Abierta</span>
            <span className="text-sm text-emerald-600">
              desde {formatDate(currentPeriod.opened_at)}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/60 rounded-lg p-2">
              <p className="text-[10px] uppercase font-semibold text-gray-500">Apertura</p>
              <p className="text-sm font-bold text-gray-900">
                {formatCurrency(currentPeriod.opening_amount)}
              </p>
            </div>
            <div className="bg-white/60 rounded-lg p-2">
              <p className="text-[10px] uppercase font-semibold text-gray-500">Comprobantes</p>
              <p className="text-sm font-bold text-gray-900">
                {currentPeriod.vouchers_count} ({formatCurrency(currentPeriod.total_vouchers)})
              </p>
            </div>
            <div className="bg-white/60 rounded-lg p-2">
              <p className="text-[10px] uppercase font-semibold text-gray-500">Esperado</p>
              <p className="text-sm font-bold text-gray-900">
                {formatCurrency(currentPeriod.expected_cash)}
              </p>
            </div>
            <div className="bg-white/60 rounded-lg p-2">
              <p className="text-[10px] uppercase font-semibold text-gray-500">Sistema</p>
              <p className="text-sm font-bold text-gray-900">
                {formatCurrency(currentPeriod.cash_on_hand)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay período abierto */}
      {!hasOpenPeriod && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">No hay período abierto</p>
              <p className="text-sm text-amber-700 mt-1">
                Debes abrir un período antes de registrar comprobantes.
                {lastClosedPeriod && (
                  <>
                    {" "}
                    El último período tuvo{" "}
                    <span
                      className={
                        lastClosedPeriod.difference_type === "faltante"
                          ? "text-red-600 font-semibold"
                          : lastClosedPeriod.difference_type === "sobrante"
                          ? "text-emerald-600 font-semibold"
                          : ""
                      }
                    >
                      {lastClosedPeriod.difference_type === "faltante"
                        ? `faltante de ${formatCurrency(Math.abs(lastClosedPeriod.difference_amount))}`
                        : lastClosedPeriod.difference_type === "sobrante"
                        ? `sobrante de ${formatCurrency(lastClosedPeriod.difference_amount)}`
                        : "cierre exacto"}
                    </span>
                    . Monto sugerido:{" "}
                    <span className="font-semibold">
                      {formatCurrency(lastClosedPeriod.suggested_next_opening)}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Abrir Período */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-900">Abrir Período de Caja</h3>
              </div>
              <button
                onClick={() => {
                  setShowOpenModal(false);
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {lastClosedPeriod && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="text-gray-600">
                    Último cierre:{" "}
                    <span
                      className={`font-medium ${
                        lastClosedPeriod.difference_type === "faltante"
                          ? "text-red-600"
                          : lastClosedPeriod.difference_type === "sobrante"
                          ? "text-emerald-600"
                          : "text-gray-800"
                      }`}
                    >
                      {lastClosedPeriod.difference_type === "faltante"
                        ? `Faltante ${formatCurrency(Math.abs(lastClosedPeriod.difference_amount))}`
                        : lastClosedPeriod.difference_type === "sobrante"
                        ? `Sobrante ${formatCurrency(lastClosedPeriod.difference_amount)}`
                        : "Exacto"}
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Monto de apertura *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Fondo base: {formatCurrency(maxAmount)}
                  {lastClosedPeriod?.suggested_next_opening &&
                    lastClosedPeriod.suggested_next_opening !== maxAmount && (
                      <> | Sugerido: {formatCurrency(lastClosedPeriod.suggested_next_opening)}</>
                    )}
                </p>
              </div>

              {lastClosedPeriod?.difference_type === "faltante" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <p className="text-amber-800">
                    <strong>Nota:</strong> Se sugiere {formatCurrency(lastClosedPeriod.suggested_next_opening)}{" "}
                    para devolver los {formatCurrency(Math.abs(lastClosedPeriod.difference_amount))}{" "}
                    que adelantó el custodio.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowOpenModal(false);
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleOpen}
                disabled={isPending}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPending ? "Abriendo..." : "Abrir Período"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cerrar Período (Arqueo) */}
      {showCloseModal && currentPeriod && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <StopCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Cerrar Caja (Arqueo)</h3>
              </div>
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setPhysicalCash("");
                  setCloseNotes("");
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Resumen del período */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Período #{currentPeriod.period_number}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Apertura:</span>{" "}
                    <span className="font-medium">{formatCurrency(currentPeriod.opening_amount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Comprobantes:</span>{" "}
                    <span className="font-medium">
                      {currentPeriod.vouchers_count} ({formatCurrency(currentPeriod.total_vouchers)})
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Efectivo esperado:</span>{" "}
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(currentPeriod.expected_cash)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Input de efectivo físico */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Efectivo físico contado *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  value={physicalCash}
                  onChange={(e) => setPhysicalCash(e.target.value)}
                  placeholder="Cuenta el dinero y escribe el total"
                />
              </div>

              {/* Cálculo de diferencia en tiempo real */}
              {diffCalc && (
                <div
                  className={`rounded-lg p-3 ${
                    diffCalc.type === "faltante"
                      ? "bg-red-50 border border-red-200"
                      : diffCalc.type === "sobrante"
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {diffCalc.type === "faltante" ? (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    ) : diffCalc.type === "sobrante" ? (
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Minus className="w-4 h-4 text-gray-600" />
                    )}
                    <span
                      className={`font-semibold ${
                        diffCalc.type === "faltante"
                          ? "text-red-700"
                          : diffCalc.type === "sobrante"
                          ? "text-emerald-700"
                          : "text-gray-700"
                      }`}
                    >
                      {diffCalc.type === "faltante"
                        ? `Faltante: ${formatCurrency(Math.abs(diffCalc.difference))}`
                        : diffCalc.type === "sobrante"
                        ? `Sobrante: ${formatCurrency(diffCalc.difference)}`
                        : "Cuadre exacto"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {diffCalc.type === "faltante" ? (
                      <>
                        El custodio adelantó {formatCurrency(Math.abs(diffCalc.difference))}. En la
                        próxima apertura se sugiere {formatCurrency(diffCalc.suggestedNext)} para
                        devolverle.
                      </>
                    ) : diffCalc.type === "sobrante" ? (
                      <>
                        Quedó efectivo sobrante. En la próxima apertura solo se necesitan{" "}
                        {formatCurrency(diffCalc.suggestedNext)} para reponer.
                      </>
                    ) : (
                      <>Próxima apertura sugerida: {formatCurrency(diffCalc.suggestedNext)}</>
                    )}
                  </p>
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Notas del cierre (opcional)
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  rows={2}
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Explicación de diferencias, observaciones..."
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setPhysicalCash("");
                  setCloseNotes("");
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleClose}
                disabled={isPending || !physicalCash}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Cerrando..." : "Cerrar Período"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial de Períodos */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Historial de Períodos</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              {periods.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay períodos registrados</p>
              ) : (
                <div className="space-y-3">
                  {periods.map((period) => (
                    <div
                      key={period.id}
                      className={`border rounded-lg p-3 ${
                        period.status === "abierto"
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">
                          Período #{period.period_number}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            period.status === "abierto"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {period.status === "abierto" ? "Abierto" : "Cerrado"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Apertura:</span>
                          <br />
                          <span className="font-medium">{formatCurrency(period.opening_amount)}</span>
                        </div>
                        {period.status === "cerrado" && (
                          <>
                            <div>
                              <span className="text-gray-500">Comprobantes:</span>
                              <br />
                              <span className="font-medium">
                                {period.vouchers_count} ({formatCurrency(period.total_vouchers_amount || 0)})
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Efectivo:</span>
                              <br />
                              <span className="font-medium">
                                {formatCurrency(period.physical_cash || 0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Diferencia:</span>
                              <br />
                              <span
                                className={`font-medium ${
                                  period.difference_type === "faltante"
                                    ? "text-red-600"
                                    : period.difference_type === "sobrante"
                                    ? "text-emerald-600"
                                    : ""
                                }`}
                              >
                                {period.difference_type === "exacto"
                                  ? "Exacto"
                                  : period.difference_type === "faltante"
                                  ? `-${formatCurrency(Math.abs(period.difference_amount || 0))}`
                                  : `+${formatCurrency(period.difference_amount || 0)}`}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                      {period.difference_notes && (
                        <p className="text-xs text-gray-500 mt-2 italic">
                          "{period.difference_notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Eliminar Período Vacío */}
      {showDeleteModal && currentPeriod && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Eliminar Período</h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">¿Eliminar el período #{currentPeriod.period_number}?</p>
                    <p className="mt-1">
                      Este período no tiene comprobantes registrados. Puedes eliminarlo si lo abriste por error.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Eliminando..." : "Eliminar Período"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  getPaymentsForReconciliation,
  getEgressesForReconciliation,
  getAccountInitialBalance,
  createReconciliation,
  saveReconciliationItems,
  updateReconciliationBankBalance,
  finalizeReconciliation,
  getReconciliation,
  getLastReconciliation,
  getReconciliationItems,
} from "../actions";
import type {
  ReconciliationPayment,
  ReconciliationEgress,
  Reconciliation,
} from "@/types/reconciliation";
import type { FinancialAccount } from "@/types/financial";
import DateInput from "../../payables/components/DateInput";
import ReconciliationList from "./ReconciliationList";

type Props = {
  condominiumId: string;
  accounts: FinancialAccount[];
  reconciliations: (Reconciliation & { financial_account?: FinancialAccount | null })[];
  initialReconciliationId?: string;
};

type SelectedEgress = {
  egress_id: string;
  check_id: string | null;
  is_check_cashed: boolean;
};

export default function ReconciliationPageClient({
  condominiumId,
  accounts,
  reconciliations,
  initialReconciliationId,
}: Props) {
  const [view, setView] = useState<"list" | "form">(initialReconciliationId ? "form" : "list");

  useEffect(() => {
    if (!initialReconciliationId && reconciliations.length > 0) {
      setView("list");
    }
  }, [initialReconciliationId, reconciliations.length]);

  const [accountId, setAccountId] = useState<string>("");
  const [cutoffDate, setCutoffDate] = useState<string>("");
  const [closingBalanceBank, setClosingBalanceBank] = useState<string>("");
  const [reconciliationDetail, setReconciliationDetail] = useState<string>("");

  const [payments, setPayments] = useState<ReconciliationPayment[]>([]);
  const [egresses, setEgresses] = useState<ReconciliationEgress[]>([]);
  const [initialBalance, setInitialBalance] = useState<number>(0);

  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [selectedEgresses, setSelectedEgresses] = useState<Map<string, SelectedEgress>>(new Map());

  const [reconciliationId, setReconciliationId] = useState<string | null>(null);
  const [reconciliationStatus, setReconciliationStatus] = useState<string | null>(null);
  const [calculatedBalance, setCalculatedBalance] = useState<number>(0);
  const [difference, setDifference] = useState<number>(0);

  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [movementsLoaded, setMovementsLoaded] = useState(false);

  // Cargar conciliación existente
  useEffect(() => {
    if (initialReconciliationId) {
      loadExistingReconciliation(initialReconciliationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReconciliationId]);

  const loadExistingReconciliation = async (reconId: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const recon = await getReconciliation(condominiumId, reconId);
      if (!recon) {
        setError("Conciliación no encontrada");
        return;
      }

      setReconciliationId(recon.id);
      setReconciliationStatus(recon.status);
      setAccountId(recon.financial_account_id);
      setCutoffDate(recon.cutoff_date);
      setClosingBalanceBank(recon.closing_balance_bank.toString());
      setReconciliationDetail(recon.notes || "");
      setInitialBalance(recon.opening_balance);
      setCalculatedBalance(recon.closing_balance_calculated);
      setDifference(recon.difference);

      // Cargar movimientos pasando el ID de la conciliación actual
      // para que NO se filtren sus propios pagos/egresos.
      // IMPORTANTE: Excluir recon.id de getLastReconciliation para que no retorne
      // ESTA MISMA conciliación como "la última", lo que crearía un rango imposible.
      const lastRecon = await getLastReconciliation(condominiumId, recon.financial_account_id, recon.id);
      const periodStart = lastRecon?.cutoff_date
        ? new Date(new Date(lastRecon.cutoff_date).getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        : "2000-01-01";

      const [paymentsData, egressesData, initialBal] = await Promise.all([
        getPaymentsForReconciliation(condominiumId, recon.financial_account_id, recon.cutoff_date, recon.id),
        getEgressesForReconciliation(condominiumId, recon.financial_account_id, recon.cutoff_date, recon.id),
        getAccountInitialBalance(recon.financial_account_id, periodStart),
      ]);

      setPayments(paymentsData || []);
      setEgresses(egressesData || []);
      setInitialBalance(initialBal || 0);
      setMovementsLoaded(true);

      // Cargar items seleccionados
      const items = await getReconciliationItems(recon.id);
      const selectedPays = new Set<string>();
      const selectedEgress = new Map<string, SelectedEgress>();

      items.forEach((item: any) => {
        if (item.payment_id) {
          selectedPays.add(item.payment_id);
        } else if (item.egress_id) {
          selectedEgress.set(item.egress_id, {
            egress_id: item.egress_id,
            check_id: item.check_id,
            is_check_cashed: item.is_check_cashed,
          });
        }
      });

      setSelectedPayments(selectedPays);
      setSelectedEgresses(selectedEgress);
    } catch (err: any) {
      setError(err.message || "Error cargando conciliación");
    } finally {
      setLoading(false);
    }
  };

  // Cargar movimientos para nueva conciliación
  const loadMovements = async (cutoff: string, account: string) => {
    if (!account || !cutoff) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const lastRecon = await getLastReconciliation(condominiumId, account);
      const periodStart = lastRecon?.cutoff_date
        ? new Date(new Date(lastRecon.cutoff_date).getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        : "2000-01-01";

      const [paymentsData, egressesData, initialBal] = await Promise.all([
        getPaymentsForReconciliation(condominiumId, account, cutoff),
        getEgressesForReconciliation(condominiumId, account, cutoff),
        getAccountInitialBalance(account, periodStart),
      ]);

      setPayments(paymentsData || []);
      setEgresses(egressesData || []);
      setInitialBalance(initialBal || 0);
      setMovementsLoaded(true);

      // Nueva conciliación: empezar sin selecciones
      setSelectedPayments(new Set());
      setSelectedEgresses(new Map());
      setReconciliationId(null);
      setReconciliationStatus(null);
    } catch (err: any) {
      console.error("Error en loadMovements:", err);
      setError(err.message || "Error cargando movimientos. Por favor, intenta de nuevo.");
      setPayments([]);
      setEgresses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMovements = () => {
    if (!accountId || !cutoffDate) {
      setError("Selecciona cuenta y fecha de corte");
      return;
    }
    loadMovements(cutoffDate, accountId);
  };

  // Calcular saldo en tiempo real
  const calculateBalance = useCallback(() => {
    const paymentsSum = Array.from(selectedPayments).reduce((sum, paymentId) => {
      const payment = payments.find((p) => p.id === paymentId);
      return sum + Number(payment?.total_amount || 0);
    }, 0);

    const egressesSum = Array.from(selectedEgresses.values()).reduce(
      (sum, egressItem) => {
        if (!egressItem.check_id || egressItem.is_check_cashed) {
          const egress = egresses.find((e) => e.id === egressItem.egress_id);
          return sum + Number(egress?.total_amount || 0);
        }
        return sum;
      },
      0
    );

    const calculated = initialBalance + paymentsSum - egressesSum;
    setCalculatedBalance(calculated);

    const bankBal = Number(closingBalanceBank || 0);
    setDifference(bankBal - calculated);
  }, [selectedPayments, selectedEgresses, payments, egresses, initialBalance, closingBalanceBank]);

  useEffect(() => {
    calculateBalance();
  }, [calculateBalance]);

  // Toggle selección de pago
  const togglePayment = (paymentId: string) => {
    const newSet = new Set(selectedPayments);
    if (newSet.has(paymentId)) {
      newSet.delete(paymentId);
    } else {
      newSet.add(paymentId);
    }
    setSelectedPayments(newSet);
  };

  // Toggle selección de egreso
  const toggleEgress = (egressId: string, checkId: string | null) => {
    const newMap = new Map(selectedEgresses);
    if (newMap.has(egressId)) {
      newMap.delete(egressId);
    } else {
      newMap.set(egressId, {
        egress_id: egressId,
        check_id: checkId,
        is_check_cashed: checkId ? false : true,
      });
    }
    setSelectedEgresses(newMap);
  };

  // Toggle estado de cheque cobrado
  const toggleCheckCashed = (egressId: string) => {
    const newMap = new Map(selectedEgresses);
    const item = newMap.get(egressId);
    if (item) {
      newMap.set(egressId, { ...item, is_check_cashed: !item.is_check_cashed });
      setSelectedEgresses(newMap);
    }
  };

  const selectAllPayments = () => setSelectedPayments(new Set(payments.map((p) => p.id)));
  const deselectAllPayments = () => setSelectedPayments(new Set());

  const selectAllEgresses = () => {
    const newMap = new Map<string, SelectedEgress>();
    egresses.forEach((e) => {
      newMap.set(e.id, {
        egress_id: e.id,
        check_id: e.check?.id || null,
        is_check_cashed: e.check ? false : true,
      });
    });
    setSelectedEgresses(newMap);
  };

  const deselectAllEgresses = () => setSelectedEgresses(new Map());

  // Guardar conciliación
  const handleSave = async () => {
    if (!accountId || !cutoffDate || !closingBalanceBank || !reconciliationDetail) {
      setError("Completa todos los campos requeridos (Cuenta, Fecha de corte, Saldo banco y Detalle)");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      try {
        let reconId = reconciliationId;

        // Si no existe, crear la conciliación
        if (!reconId) {
          const result = await createReconciliation(condominiumId, {
            financial_account_id: accountId,
            cutoff_date: cutoffDate,
            closing_balance_bank: Number(closingBalanceBank),
            notes: reconciliationDetail,
          });

          if (result.error) {
            setError(result.error);
            if ((result as any).reconciliationId) {
              setReconciliationId((result as any).reconciliationId);
            }
            return;
          }

          reconId = (result as any).reconciliationId;
          setReconciliationId(reconId);
          setReconciliationStatus("borrador");
        } else {
          // Actualizar saldo banco y detalle si cambiaron
          const updateResult = await updateReconciliationBankBalance(
            condominiumId,
            reconId,
            Number(closingBalanceBank),
            reconciliationDetail
          );
          if (updateResult.error) {
            setError(updateResult.error);
            return;
          }
        }

        if (!reconId) {
          setError("Error: no se pudo obtener el ID de la conciliación");
          return;
        }

        // Guardar items
        const itemsResult = await saveReconciliationItems(condominiumId, {
          reconciliation_id: reconId,
          selected_payments: Array.from(selectedPayments),
          selected_egresses: Array.from(selectedEgresses.values()),
        });

        if (itemsResult.error) {
          setError(itemsResult.error);
          return;
        }

        const result = itemsResult as any;
        setCalculatedBalance(result.calculatedBalance);
        setDifference(result.difference);
        if (result.status) {
          setReconciliationStatus(result.status);
        }

        setSuccessMessage("Conciliación guardada exitosamente");
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err: any) {
        setError(err.message || "Error guardando conciliación");
      }
    });
  };

  // Finalizar conciliación
  const handleFinalize = async () => {
    if (!reconciliationId) {
      setError("Primero debes guardar la conciliación");
      return;
    }

    // No permitir si hay diferencia (el servidor lo rechazará igual, pero mejor feedback)
    if (!isEffectivelyZeroClient(difference)) {
      setError("No se puede finalizar. La diferencia debe ser $0.00. Ajusta la selección de ingresos/egresos o el saldo del banco.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await finalizeReconciliation(condominiumId, reconciliationId);
        if (result.error) {
          setError(result.error);
        } else {
          setReconciliationStatus("conciliada");
          setSuccessMessage("Conciliación finalizada exitosamente");
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      } catch (err: any) {
        setError(err.message || "Error finalizando conciliación");
      }
    });
  };

  // Helper para verificar diferencia cero en cliente
  function isEffectivelyZeroClient(amount: number): boolean {
    return Math.abs(Math.round(amount * 100)) === 0;
  }

  // Resetear formulario para nueva conciliación
  const handleNewReconciliation = () => {
    setReconciliationId(null);
    setReconciliationStatus(null);
    setAccountId("");
    setCutoffDate("");
    setClosingBalanceBank("");
    setReconciliationDetail("");
    setPayments([]);
    setEgresses([]);
    setInitialBalance(0);
    setSelectedPayments(new Set());
    setSelectedEgresses(new Map());
    setCalculatedBalance(0);
    setDifference(0);
    setError(null);
    setSuccessMessage(null);
    setMovementsLoaded(false);
    setView("form");
  };

  const isFinalized = reconciliationStatus === "conciliada";

  // Si estamos en vista de lista
  if (view === "list") {
    return (
      <div className="space-y-6">
        <ReconciliationList
          condominiumId={condominiumId}
          reconciliations={reconciliations}
          onSelect={(reconId) => {
            setView("form");
            loadExistingReconciliation(reconId);
          }}
          onCreateNew={handleNewReconciliation}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botón para volver a la lista */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => {
            setView("list");
            // Limpiar estado
            setReconciliationId(null);
            setReconciliationStatus(null);
            setMovementsLoaded(false);
          }}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          ← Volver a lista de conciliaciones
        </button>
        <h2 className="text-lg font-semibold">
          {reconciliationId
            ? isFinalized
              ? "Ver Conciliación (Conciliada)"
              : "Editar Conciliación"
            : "Nueva Conciliación"}
        </h2>
      </div>

      {/* Banner de modo */}
      {reconciliationId && isFinalized && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm">
          <p className="font-semibold">Conciliación finalizada</p>
          <p className="mt-1">
            Puedes modificar la selección de ingresos y egresos si necesitas corregir algo (ej. deseleccionar un pago para anularlo).
            Si la diferencia deja de ser $0.00, el estado volverá a borrador automáticamente.
          </p>
        </div>
      )}

      {reconciliationId && !isFinalized && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md text-sm">
          <p className="font-semibold">Modo edición (borrador)</p>
          <p className="mt-1">La fecha de corte no se puede modificar. Puedes cambiar la selección de ingresos/egresos y el saldo del banco.</p>
        </div>
      )}

      {/* Configuración inicial */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Configuración de Conciliación</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
              Cuenta o Caja *
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={!!reconciliationId}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Seleccione una cuenta o caja</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bank_name} - {acc.account_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
              Fecha de Corte *
            </label>
            <DateInput
              value={cutoffDate}
              onChange={setCutoffDate}
              required
              disabled={!!reconciliationId}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
              Saldo Real en Banco *
            </label>
            <input
              type="number"
              step="0.01"
              value={closingBalanceBank}
              onChange={(e) => setClosingBalanceBank(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-white focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 block">
            Detalle *
          </label>
          <textarea
            value={reconciliationDetail}
            onChange={(e) => setReconciliationDetail(e.target.value)}
            placeholder="Ej: Enero 2026, CONCILIACION DICIEMBRE 2025, etc."
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 min-h-[80px]"
          />
        </div>

        {!reconciliationId && (
          <button
            onClick={handleLoadMovements}
            disabled={!accountId || !cutoffDate || loading}
            className="px-4 py-2 bg-brand text-white rounded-md text-sm font-semibold hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Cargando..." : "Cargar Movimientos"}
          </button>
        )}
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start gap-2">
          <span className="mt-0.5">&#9888;</span>
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-start gap-2">
          <span className="mt-0.5">&#10003;</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Resumen de cálculo */}
      {movementsLoaded && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Resumen de Conciliación</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] uppercase text-gray-500 font-semibold">Saldo Inicial</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(initialBalance)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-500 font-semibold">Saldo Calculado</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(calculatedBalance)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-500 font-semibold">Saldo Banco</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(Number(closingBalanceBank || 0))}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-500 font-semibold">Diferencia</p>
              <p className={`text-xl font-bold ${isEffectivelyZeroClient(difference) ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(Math.abs(difference))}
                {!isEffectivelyZeroClient(difference) && (
                  <span className="text-xs ml-1">({difference > 0 ? "Faltante" : "Sobrante"})</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay movimientos */}
      {!loading && movementsLoaded && payments.length === 0 && egresses.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
          <p className="font-semibold">Sin movimientos</p>
          <p className="text-sm mt-1">
            No se encontraron ingresos ni egresos disponibles para la cuenta seleccionada hasta la fecha de corte ({cutoffDate}).
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>No hay movimientos registrados en ese período</li>
            <li>Todos los movimientos ya fueron conciliados en períodos anteriores</li>
            <li>La fecha de corte es anterior a los movimientos registrados</li>
          </ul>
        </div>
      )}

      {/* Lista de Ingresos */}
      {movementsLoaded && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Ingresos ({selectedPayments.size} de {payments.length} seleccionados)
            </h2>
            {payments.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={selectAllPayments}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Seleccionar Todos
                </button>
                <button
                  onClick={deselectAllPayments}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Deseleccionar Todos
                </button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            {payments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No hay ingresos disponibles para este período.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80 text-[11px] uppercase tracking-wide text-gray-600 font-bold">
                  <tr>
                    <th className="px-4 py-3 w-12"></th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">N° Recibo</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Método</th>
                    <th className="px-4 py-3">Referencia</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className={`hover:bg-gray-50 ${selectedPayments.has(payment.id) ? "bg-blue-50" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedPayments.has(payment.id)}
                          onChange={() => togglePayment(payment.id)}
                          className="w-4 h-4 text-brand focus:ring-brand"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-800">{payment.payment_date}</td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-800">
                        {payment.folio_rec ? payment.folio_rec.toString().padStart(4, "0") : "--"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {payment.unit?.full_identifier || payment.unit?.identifier || "--"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{payment.payment_method || "--"}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{payment.reference_number || "--"}</td>
                      <td className="px-4 py-3 text-xs text-right font-semibold text-gray-900">
                        {formatCurrency(payment.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Lista de Egresos */}
      {movementsLoaded && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Egresos ({selectedEgresses.size} de {egresses.length} seleccionados)
            </h2>
            {egresses.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={selectAllEgresses}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Seleccionar Todos
                </button>
                <button
                  onClick={deselectAllEgresses}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Deseleccionar Todos
                </button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            {egresses.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No hay egresos disponibles para este período.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80 text-[11px] uppercase tracking-wide text-gray-600 font-bold">
                  <tr>
                    <th className="px-4 py-3 w-12"></th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">N° Egreso</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Método</th>
                    <th className="px-4 py-3">Referencia</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {egresses.map((egress) => {
                    const isSelected = selectedEgresses.has(egress.id);
                    const hasCheck = !!egress.check;

                    return (
                      <tr
                        key={egress.id}
                        className={`hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEgress(egress.id, egress.check?.id || null)}
                            className="w-4 h-4 text-brand focus:ring-brand"
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-800">{egress.payment_date}</td>
                        <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-800">
                          {egress.folio_eg ? egress.folio_eg.toString().padStart(4, "0") : "--"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">{egress.supplier?.name || "--"}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{egress.payment_method || "--"}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">
                          {hasCheck && egress.check?.check_number ? (
                            <span className="font-semibold">#{egress.check.check_number}</span>
                          ) : egress.reference_number ? (
                            <span>{egress.reference_number}</span>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-right font-semibold text-gray-900">
                          {formatCurrency(egress.total_amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Botones de acción */}
      {movementsLoaded && (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleSave}
            disabled={isPending || !accountId || !closingBalanceBank || !reconciliationDetail}
            className="px-6 py-2 bg-brand text-white rounded-md text-sm font-semibold hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Guardando..." : "Guardar Borrador"}
          </button>
          {reconciliationId && !isFinalized && isEffectivelyZeroClient(difference) && (
            <button
              onClick={handleFinalize}
              disabled={isPending}
              className="px-6 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Finalizando..." : "Finalizar Conciliación"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

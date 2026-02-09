"use client";

import { useState, useTransition, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  getPaymentsForReconciliation,
  getEgressesForReconciliation,
  getAccountInitialBalance,
  createReconciliation,
  saveReconciliationItems,
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
  
  // Si no hay reconciliationId inicial, mostrar lista primero
  useEffect(() => {
    if (!initialReconciliationId && reconciliations.length > 0) {
      setView("list");
    }
  }, [initialReconciliationId, reconciliations.length]);
  const [accountId, setAccountId] = useState<string>("");
  const [cutoffDate, setCutoffDate] = useState<string>("");
  const [closingBalanceBank, setClosingBalanceBank] = useState<string>("");
  const [reconciliationDetail, setReconciliationDetail] = useState<string>(""); // Nombre/Detalle de la conciliación

  const [payments, setPayments] = useState<ReconciliationPayment[]>([]);
  const [egresses, setEgresses] = useState<ReconciliationEgress[]>([]);
  const [initialBalance, setInitialBalance] = useState<number>(0);

  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(
    new Set()
  );
  const [selectedEgresses, setSelectedEgresses] = useState<
    Map<string, SelectedEgress>
  >(new Map());

  const [reconciliationId, setReconciliationId] = useState<string | null>(null);
  const [calculatedBalance, setCalculatedBalance] = useState<number>(0);
  const [difference, setDifference] = useState<number>(0);

  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar conciliación existente
  useEffect(() => {
    if (initialReconciliationId) {
      loadExistingReconciliation(initialReconciliationId);
    }
  }, [initialReconciliationId]);

  const loadExistingReconciliation = async (reconId: string) => {
    setLoading(true);
    setError(null);
    try {
      const recon = await getReconciliation(condominiumId, reconId);
      if (!recon) {
        setError("Conciliación no encontrada");
        return;
      }

      setReconciliationId(recon.id);
      setAccountId(recon.financial_account_id);
      setCutoffDate(recon.cutoff_date);
      setClosingBalanceBank(recon.closing_balance_bank.toString());
      setReconciliationDetail(recon.notes || ""); // El campo notes contiene el detalle/nombre
      setInitialBalance(recon.opening_balance);
      setCalculatedBalance(recon.closing_balance_calculated);
      setDifference(recon.difference);
      
      // Marcar que estamos editando una conciliación existente
      // Esto bloqueará los campos de fecha y cuenta

      // Cargar movimientos y items seleccionados
      await loadMovements(recon.cutoff_date, recon.financial_account_id, recon.id);
      
      // Cargar items seleccionados después de que se carguen los movimientos
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

  // Cargar movimientos cuando se selecciona cuenta y fecha de corte
  const loadMovements = async (cutoff: string, account: string, existingReconId?: string) => {
    if (!account || !cutoff) return;

    setLoading(true);
    setError(null);

    try {
      // Obtener la última conciliación para calcular el saldo inicial
      const lastRecon = await getLastReconciliation(condominiumId, account);
      const periodStart = lastRecon?.cutoff_date 
        ? new Date(new Date(lastRecon.cutoff_date).getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        : "2000-01-01";

      const [paymentsData, egressesData, initialBal] = await Promise.all([
        getPaymentsForReconciliation(condominiumId, account, cutoff),
        getEgressesForReconciliation(condominiumId, account, cutoff),
        getAccountInitialBalance(account, periodStart),
      ]);

      console.log("Movimientos cargados:", {
        payments: paymentsData?.length || 0,
        egresses: egressesData?.length || 0,
        initialBalance: initialBal,
      });

      setPayments(paymentsData || []);
      setEgresses(egressesData || []);
      setInitialBalance(initialBal || 0);

      // Si hay una conciliación existente, cargar los items seleccionados
      if (existingReconId) {
        // TODO: Cargar items seleccionados de la conciliación
        // Por ahora, resetear selecciones
        setSelectedPayments(new Set());
        setSelectedEgresses(new Map());
      } else {
        setSelectedPayments(new Set());
        setSelectedEgresses(new Map());
        setReconciliationId(null);
      }

      // No mostrar error si no hay movimientos, solo mostrar las listas vacías
      // El usuario debe poder ver que no hay movimientos disponibles
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
  const calculateBalance = () => {
    const paymentsSum = Array.from(selectedPayments).reduce((sum, paymentId) => {
      const payment = payments.find((p) => p.id === paymentId);
      return sum + Number(payment?.total_amount || 0);
    }, 0);

    const egressesSum = Array.from(selectedEgresses.values()).reduce(
      (sum, egressItem) => {
        // Solo contar egresos que no tienen cheque o tienen cheque cobrado
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
  };

  // Actualizar cálculo cuando cambian las selecciones
  useEffect(() => {
    calculateBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPayments, selectedEgresses, payments, egresses, initialBalance, closingBalanceBank]);

  // Toggle selección de pago
  const togglePayment = (paymentId: string) => {
    const newSet = new Set(selectedPayments);
    if (newSet.has(paymentId)) {
      newSet.delete(paymentId);
    } else {
      newSet.add(paymentId);
    }
    setSelectedPayments(newSet);
    calculateBalance();
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
        is_check_cashed: checkId ? false : true, // Si no tiene cheque, se considera "cobrado"
      });
    }
    setSelectedEgresses(newMap);
    calculateBalance();
  };

  // Toggle estado de cheque cobrado
  const toggleCheckCashed = (egressId: string) => {
    const newMap = new Map(selectedEgresses);
    const item = newMap.get(egressId);
    if (item) {
      newMap.set(egressId, {
        ...item,
        is_check_cashed: !item.is_check_cashed,
      });
      setSelectedEgresses(newMap);
      calculateBalance();
    }
  };

  // Seleccionar todos los pagos
  const selectAllPayments = () => {
    const allIds = new Set(payments.map((p) => p.id));
    setSelectedPayments(allIds);
    calculateBalance();
  };

  // Deseleccionar todos los pagos
  const deselectAllPayments = () => {
    setSelectedPayments(new Set());
    calculateBalance();
  };

  // Seleccionar todos los egresos
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
    calculateBalance();
  };

  // Deseleccionar todos los egresos
  const deselectAllEgresses = () => {
    setSelectedEgresses(new Map());
    calculateBalance();
  };

  // Guardar conciliación
  const handleSave = async () => {
    if (!accountId || !cutoffDate || !closingBalanceBank || !reconciliationDetail) {
      setError("Completa todos los campos requeridos (Cuenta, Fecha de corte, Saldo banco y Detalle)");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        // Crear o usar conciliación existente
        let reconId = reconciliationId;
        if (!reconId) {
          const result = await createReconciliation(condominiumId, {
            financial_account_id: accountId,
            cutoff_date: cutoffDate,
            closing_balance_bank: Number(closingBalanceBank),
            notes: reconciliationDetail, // El detalle/nombre va en notes
          });

          if (result.error) {
            setError(result.error);
            // Si el error incluye un reconciliationId, significa que ya existe una conciliación
            if ((result as any).reconciliationId) {
              setReconciliationId((result as any).reconciliationId);
            }
            return;
          }

          reconId = (result as any).reconciliationId;
          setReconciliationId(reconId);
        }

        // Guardar items
        if (!reconId) {
          setError("Error: no se pudo obtener el ID de la conciliación");
          return;
        }
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
        
        // Recargar la página para actualizar la lista
        window.location.reload();
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

    if (Math.abs(difference) > 0.01) {
      const confirm = window.confirm(
        `Hay una diferencia de ${formatCurrency(
          Math.abs(difference)
        )}. ¿Estás seguro de finalizar la conciliación?`
      );
      if (!confirm) return;
    }

    startTransition(async () => {
      try {
        const result = await finalizeReconciliation(
          condominiumId,
          reconciliationId
        );
        if (result.error) {
          setError(result.error);
        } else {
          // Recargar la página para actualizar la lista
          window.location.href = `/app/${condominiumId}/reconciliation`;
        }
      } catch (err: any) {
        setError(err.message || "Error finalizando conciliación");
      }
    });
  };

  const selectedAccount = accounts.find((a) => a.id === accountId);

  // Si estamos en vista de lista, mostrar la lista
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
          onCreateNew={() => setView("form")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botón para volver a la lista */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setView("list")}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          ← Volver a lista de conciliaciones
        </button>
        <h2 className="text-lg font-semibold">
          {reconciliationId ? "Editar Conciliación" : "Nueva Conciliación"}
        </h2>
      </div>
      
      {reconciliationId && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md text-sm">
          <p className="font-semibold">Modo edición</p>
          <p className="mt-1">La fecha de corte y el saldo inicial no se pueden modificar una vez creada la conciliación. Puedes cambiar la selección de ingresos y egresos libremente.</p>
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
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-white focus:border-brand focus:ring-2 focus:ring-brand/30"
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
              disabled={!!reconciliationId} // Bloquear si estamos editando
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
              onChange={(e) => {
                setClosingBalanceBank(e.target.value);
                calculateBalance();
              }}
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
        
        {reconciliationId && (
          <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-md text-sm text-gray-600">
            <p>Los movimientos ya están cargados. Puedes modificar las selecciones de ingresos y egresos.</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Resumen de cálculo */}
      {payments.length > 0 || egresses.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Resumen de Conciliación</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] uppercase text-gray-500 font-semibold">
                Saldo Inicial
              </p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(initialBalance)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-500 font-semibold">
                Saldo Calculado
              </p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(calculatedBalance)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-500 font-semibold">
                Saldo Banco
              </p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(Number(closingBalanceBank || 0))}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-500 font-semibold">
                Diferencia
              </p>
              <p
                className={`text-xl font-bold ${
                  Math.abs(difference) < 0.01
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(Math.abs(difference))}
                {Math.abs(difference) >= 0.01 && (
                  <span className="text-xs ml-1">
                    ({difference > 0 ? "Faltante" : "Sobrante"})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mensaje informativo cuando no hay movimientos pero ya se intentó cargar */}
      {!loading && payments.length === 0 && egresses.length === 0 && accountId && cutoffDate && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
          <p className="font-semibold">Movimientos cargados</p>
          <p className="text-sm mt-1">
            No se encontraron ingresos ni egresos disponibles para la cuenta seleccionada hasta la fecha de corte ({cutoffDate}).
          </p>
          <p className="text-sm mt-2 font-semibold">Posibles razones:</p>
          <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
            <li>No hay movimientos registrados en ese período</li>
            <li>Todos los movimientos ya fueron conciliados en períodos anteriores</li>
            <li>La fecha de corte es anterior a los movimientos registrados</li>
            <li>Los movimientos están en otra cuenta bancaria</li>
          </ul>
          <p className="text-xs mt-2 text-blue-700">
            💡 Revisa la consola del navegador (F12) para ver logs detallados de la búsqueda.
          </p>
        </div>
      )}

      {/* Lista de Ingresos - Mostrar siempre después de cargar */}
      {accountId && cutoffDate && !loading && (
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
                    className={`hover:bg-gray-50 ${
                      selectedPayments.has(payment.id) ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPayments.has(payment.id)}
                        onChange={() => togglePayment(payment.id)}
                        className="w-4 h-4 text-brand focus:ring-brand"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-800">
                      {payment.payment_date}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-800">
                      {payment.folio_rec
                        ? payment.folio_rec.toString().padStart(4, "0")
                        : "--"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {payment.unit?.full_identifier || payment.unit?.identifier || "--"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {payment.payment_method || "--"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {payment.reference_number || "--"}
                    </td>
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

      {/* Lista de Egresos - Mostrar siempre después de cargar */}
      {accountId && cutoffDate && !loading && (
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
                  const selectedItem = selectedEgresses.get(egress.id);
                  const hasCheck = !!egress.check;
                  const isCheckCashed =
                    selectedItem?.is_check_cashed ?? (hasCheck ? false : true);

                  return (
                    <tr
                      key={egress.id}
                      className={`hover:bg-gray-50 ${
                        isSelected ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            toggleEgress(egress.id, egress.check?.id || null)
                          }
                          className="w-4 h-4 text-brand focus:ring-brand"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-800">
                        {egress.payment_date}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-800">
                        {egress.folio_eg
                          ? egress.folio_eg.toString().padStart(4, "0")
                          : "--"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {egress.supplier?.name || "--"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {egress.payment_method || "--"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {(() => {
                          // Si tiene cheque, mostrar número de cheque
                          if (hasCheck && egress.check?.check_number) {
                            return (
                              <span className="font-semibold">
                                #{egress.check.check_number}
                              </span>
                            );
                          }
                          // Si tiene reference_number, mostrarlo
                          if (egress.reference_number) {
                            return <span>{egress.reference_number}</span>;
                          }
                          // Si no tiene nada, mostrar guión
                          return "--";
                        })()}
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
      {payments.length > 0 || egresses.length > 0 ? (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleSave}
            disabled={isPending || !accountId || !closingBalanceBank}
            className="px-6 py-2 bg-brand text-white rounded-md text-sm font-semibold hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Guardando..." : "Guardar Borrador"}
          </button>
          {reconciliationId && (
            <button
              onClick={handleFinalize}
              disabled={isPending}
              className="px-6 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Finalizando..." : "Finalizar Conciliación"}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

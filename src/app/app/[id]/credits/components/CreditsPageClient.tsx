"use client";

import { useEffect, useState, useTransition } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  listCredits,
  getUnitsWithCredit,
  applyCreditToCharge,
  cancelCredit,
  createManualCredit,
  getPendingChargesForCredit,
  type UnitCredit,
  type UnitCreditSummary,
} from "../actions";

type Option = { value: string; label: string };

type PendingCharge = {
  id: string;
  period: string | null;
  description: string | null;
  due_date: string | null;
  total_amount: number;
  balance: number;
  expense_item_name: string | null;
};

type Props = {
  condominiumId: string;
  units: Option[];
  initialUnitId?: string;
};

const statusLabels: Record<string, string> = {
  activo: "Activo",
  aplicado: "Aplicado",
  expirado: "Expirado",
  devuelto: "Devuelto",
};

export default function CreditsPageClient({ condominiumId, units, initialUnitId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Filtros
  const [filterUnitId, setFilterUnitId] = useState<string>(initialUnitId || "");
  const [filterStatus, setFilterStatus] = useState<"activo" | "aplicado" | "expirado" | "devuelto" | "">("activo");

  // Datos
  const [credits, setCredits] = useState<UnitCredit[]>([]);
  const [unitsWithCredit, setUnitsWithCredit] = useState<UnitCreditSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de aplicación de crédito
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<UnitCredit | null>(null);
  const [pendingCharges, setPendingCharges] = useState<PendingCharge[]>([]);
  const [selectedChargeId, setSelectedChargeId] = useState<string>("");
  const [applyAmount, setApplyAmount] = useState<number>(0);
  const [applyNotes, setApplyNotes] = useState<string>("");
  const [loadingCharges, setLoadingCharges] = useState(false);

  // Modal de cancelación
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [creditToCancel, setCreditToCancel] = useState<UnitCredit | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");

  // Modal de crear crédito manual
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCreditUnitId, setNewCreditUnitId] = useState<string>("");
  const [newCreditAmount, setNewCreditAmount] = useState<number>(0);
  const [newCreditDescription, setNewCreditDescription] = useState<string>("");

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, [filterUnitId, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [creditsData, summaryData] = await Promise.all([
        listCredits(condominiumId, {
          unitId: filterUnitId || undefined,
          status: (filterStatus as "activo" | "aplicado" | "expirado" | "devuelto") || undefined,
        }),
        getUnitsWithCredit(condominiumId),
      ]);
      setCredits(creditsData);
      setUnitsWithCredit(summaryData);
    } catch (error) {
      console.error("Error cargando créditos:", error);
    }
    setLoading(false);
  };

  // Abrir modal de aplicación
  const openApplyModal = async (credit: UnitCredit) => {
    setSelectedCredit(credit);
    setSelectedChargeId("");
    setApplyAmount(Number(credit.remaining_amount) || 0);
    setApplyNotes("");
    setShowApplyModal(true);

    // Cargar cargos pendientes de la unidad
    setLoadingCharges(true);
    const charges = await getPendingChargesForCredit(condominiumId, credit.unit_id);
    setPendingCharges(charges);
    setLoadingCharges(false);
  };

  // Ejecutar aplicación de crédito
  const handleApplyCredit = () => {
    if (!selectedCredit || !selectedChargeId || applyAmount <= 0) {
      setMessage({ type: "error", text: "Selecciona un cargo y monto válido" });
      return;
    }

    startTransition(async () => {
      const result = await applyCreditToCharge(
        condominiumId,
        selectedCredit.id,
        selectedChargeId,
        applyAmount,
        applyNotes || undefined
      );

      if (result.success) {
        setMessage({ type: "success", text: "Crédito aplicado correctamente" });
        setShowApplyModal(false);
        loadData();
      } else {
        setMessage({ type: "error", text: result.error || "Error al aplicar crédito" });
      }
    });
  };

  // Abrir modal de cancelación
  const openCancelModal = (credit: UnitCredit) => {
    setCreditToCancel(credit);
    setCancelReason("");
    setShowCancelModal(true);
  };

  // Ejecutar cancelación
  const handleCancelCredit = () => {
    if (!creditToCancel || !cancelReason.trim()) {
      setMessage({ type: "error", text: "Ingresa el motivo de cancelación" });
      return;
    }

    startTransition(async () => {
      const result = await cancelCredit(condominiumId, creditToCancel.id, cancelReason);

      if (result.success) {
        setMessage({ type: "success", text: "Crédito cancelado correctamente" });
        setShowCancelModal(false);
        loadData();
      } else {
        setMessage({ type: "error", text: result.error || "Error al cancelar crédito" });
      }
    });
  };

  // Crear crédito manual
  const handleCreateManualCredit = () => {
    if (!newCreditUnitId || newCreditAmount <= 0 || !newCreditDescription.trim()) {
      setMessage({ type: "error", text: "Completa todos los campos" });
      return;
    }

    startTransition(async () => {
      const result = await createManualCredit(
        condominiumId,
        newCreditUnitId,
        newCreditAmount,
        newCreditDescription
      );

      if (result.success) {
        setMessage({ type: "success", text: "Crédito creado correctamente" });
        setShowCreateModal(false);
        setNewCreditUnitId("");
        setNewCreditAmount(0);
        setNewCreditDescription("");
        loadData();
      } else {
        setMessage({ type: "error", text: result.error || "Error al crear crédito" });
      }
    });
  };

  // Calcular totales
  const totalCreditsAmount = credits
    .filter((c) => c.status === "activo")
    .reduce((sum, c) => sum + c.remaining_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Créditos y Saldos a Favor</h1>
          <p className="text-sm text-gray-600">
            Gestiona los saldos a favor, anticipos y pagos adelantados de las unidades.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="bg-brand text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-brand-dark"
        >
          + Crear crédito manual
        </button>
      </div>

      {/* Mensaje */}
      {message && (
        <div
          className={`text-sm font-semibold px-3 py-2 rounded-md ${
            message.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Resumen de unidades con crédito */}
      {unitsWithCredit.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-emerald-800 mb-3">
            Unidades con saldo a favor ({unitsWithCredit.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {unitsWithCredit.map((u) => (
              <button
                key={u.unit_id}
                onClick={() => setFilterUnitId(u.unit_id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterUnitId === u.unit_id
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                }`}
              >
                <span>{u.unit_identifier}</span>
                <span className="font-bold">{formatCurrency(u.total_credit_available)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Filtrar por unidad</label>
            <select
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={filterUnitId}
              onChange={(e) => setFilterUnitId(e.target.value)}
            >
              <option value="">Todas las unidades</option>
              {units.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Estado</label>
            <select
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="activo">Activos (con saldo)</option>
              <option value="aplicado">Aplicados</option>
              <option value="expirado">Expirados</option>
              <option value="devuelto">Devueltos</option>
              <option value="">Todos</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="bg-slate-100 rounded-lg px-4 py-2 w-full">
              <p className="text-xs text-slate-600">Total saldo disponible</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(totalCreditsAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de créditos */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Unidad</th>
              <th className="px-4 py-3 text-left">Origen</th>
              <th className="px-4 py-3 text-right">Monto original</th>
              <th className="px-4 py-3 text-right">Saldo disponible</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Vence</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                  Cargando créditos...
                </td>
              </tr>
            ) : credits.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                  No se encontraron créditos con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              credits.map((credit) => (
                <tr key={credit.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {credit.unit?.full_identifier || credit.unit?.identifier || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {credit.source_payment ? (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                        Pago #{credit.source_payment.folio_rec || "—"}
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                        Ajuste manual
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatCurrency(credit.amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {formatCurrency(credit.remaining_amount)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(credit.created_at).toLocaleDateString("es-EC")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {credit.expires_at
                      ? new Date(credit.expires_at).toLocaleDateString("es-EC")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        credit.status === "activo"
                          ? "bg-emerald-100 text-emerald-700"
                          : credit.status === "aplicado"
                          ? "bg-blue-100 text-blue-600"
                          : credit.status === "expirado"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {statusLabels[credit.status] || credit.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {credit.status === "activo" && credit.remaining_amount > 0 && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openApplyModal(credit)}
                          className="text-xs text-brand hover:text-brand-dark font-medium"
                        >
                          Aplicar
                        </button>
                        <button
                          onClick={() => openCancelModal(credit)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Anular
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Aplicar crédito a cargo */}
      {showApplyModal && selectedCredit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Aplicar crédito a cargo</h3>
              <button onClick={() => setShowApplyModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm text-emerald-700">
                <strong>Crédito disponible:</strong> {formatCurrency(selectedCredit.remaining_amount)}
              </p>
              <p className="text-xs text-emerald-600">
                Unidad: {selectedCredit.unit?.full_identifier || "—"}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Seleccionar cargo a pagar</label>
              {loadingCharges ? (
                <p className="text-sm text-gray-500">Cargando cargos pendientes...</p>
              ) : pendingCharges.length === 0 ? (
                <p className="text-sm text-amber-600">Esta unidad no tiene cargos pendientes.</p>
              ) : (
                <select
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  value={selectedChargeId}
                  onChange={(e) => {
                    setSelectedChargeId(e.target.value);
                    const charge = pendingCharges.find((c) => c.id === e.target.value);
                    if (charge) {
                      setApplyAmount(Math.min(selectedCredit.remaining_amount, charge.balance));
                    }
                  }}
                >
                  <option value="">Selecciona un cargo</option>
                  {pendingCharges.map((charge) => (
                    <option key={charge.id} value={charge.id}>
                      {charge.expense_item_name || "Cargo"} - {charge.period || charge.description || "Sin periodo"} - Saldo: {formatCurrency(charge.balance)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Monto a aplicar</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                value={applyAmount}
                onChange={(e) => setApplyAmount(Number(parseFloat(e.target.value || "0").toFixed(2)))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Notas (opcional)</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                value={applyNotes}
                onChange={(e) => setApplyNotes(e.target.value)}
                placeholder="Observaciones del cruce"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowApplyModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyCredit}
                disabled={isPending || !selectedChargeId || applyAmount <= 0}
                className="bg-brand text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-brand-dark disabled:opacity-50"
              >
                {isPending ? "Aplicando..." : "Aplicar crédito"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancelar crédito */}
      {showCancelModal && creditToCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Anular crédito</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                ¿Estás seguro de anular este crédito de{" "}
                <strong>{formatCurrency(creditToCancel.remaining_amount)}</strong>?
              </p>
              <p className="text-xs text-red-600 mt-1">Esta acción no se puede deshacer.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Motivo de anulación *</label>
              <textarea
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ingresa el motivo..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCancelCredit}
                disabled={isPending || !cancelReason.trim()}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Anulando..." : "Anular crédito"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear crédito manual */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Crear crédito manual</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Usa esto para registrar ajustes manuales, devoluciones u otros créditos especiales.
            </p>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Unidad *</label>
              <select
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                value={newCreditUnitId}
                onChange={(e) => setNewCreditUnitId(e.target.value)}
              >
                <option value="">Selecciona una unidad</option>
                {units.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Monto *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                value={newCreditAmount || ""}
                onChange={(e) => setNewCreditAmount(Number(parseFloat(e.target.value || "0").toFixed(2)))}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Descripción / Motivo *</label>
              <textarea
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                rows={3}
                value={newCreditDescription}
                onChange={(e) => setNewCreditDescription(e.target.value)}
                placeholder="Ej: Ajuste por error en facturación, Devolución de pago duplicado, etc."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateManualCredit}
                disabled={isPending || !newCreditUnitId || newCreditAmount <= 0 || !newCreditDescription.trim()}
                className="bg-brand text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-brand-dark disabled:opacity-50"
              >
                {isPending ? "Creando..." : "Crear crédito"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

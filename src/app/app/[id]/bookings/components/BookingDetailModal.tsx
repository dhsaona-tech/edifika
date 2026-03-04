"use client";

import { useState, useTransition } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  CircleDot,
  MapPin,
  User,
  Building2,
  CalendarDays,
  DollarSign,
  Shield,
  ArrowRight,
  Undo2,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { Booking, BookingStatus } from "@/types/bookings";
import {
  approveBooking,
  cancelBooking,
  completeBooking,
  resolveGuarantee,
} from "../actions";

interface Props {
  condominiumId: string;
  booking: Booking;
  financialAccounts: {
    id: string;
    bank_name: string;
    account_number: string;
  }[];
  onClose: () => void;
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bgColor: string; icon: typeof Clock }
> = {
  pending_approval: {
    label: "Pendiente de Aprobación",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmada",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    icon: CheckCircle,
  },
  canceled: {
    label: "Cancelada",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    icon: XCircle,
  },
  completed: {
    label: "Completada",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    icon: CircleDot,
  },
};

export default function BookingDetailModal({
  condominiumId,
  booking,
  financialAccounts,
  onClose,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Cancel form
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Guarantee resolution
  const [showGuaranteeForm, setShowGuaranteeForm] = useState(false);
  const [guaranteeResolution, setGuaranteeResolution] = useState<
    "applied_to_balance" | "refunded_externally"
  >("applied_to_balance");
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const statusConfig = STATUS_CONFIG[booking.status];
  const StatusIcon = statusConfig.icon;

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-EC", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleApprove = () => {
    setError("");
    startTransition(async () => {
      const res = await approveBooking(condominiumId, booking.id);
      if (res.error) setError(res.error);
      else {
        setSuccess("Reserva aprobada.");
        setTimeout(onClose, 1200);
      }
    });
  };

  const handleCancel = () => {
    if (!cancelReason.trim()) {
      setError("Debe indicar el motivo de cancelación.");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await cancelBooking(
        condominiumId,
        booking.id,
        cancelReason.trim()
      );
      if (res.error) setError(res.error);
      else {
        setSuccess("Reserva cancelada.");
        setTimeout(onClose, 1200);
      }
    });
  };

  const handleComplete = () => {
    setError("");
    startTransition(async () => {
      const res = await completeBooking(condominiumId, booking.id);
      if (res.error) setError(res.error);
      else {
        setSuccess("Reserva completada.");
        setTimeout(onClose, 1200);
      }
    });
  };

  const handleResolveGuarantee = () => {
    setError("");
    if (
      guaranteeResolution === "refunded_externally" &&
      !selectedAccountId
    ) {
      setError("Debe seleccionar una cuenta para la devolución.");
      return;
    }
    startTransition(async () => {
      const res = await resolveGuarantee(
        condominiumId,
        booking.id,
        guaranteeResolution,
        guaranteeResolution === "refunded_externally"
          ? selectedAccountId
          : undefined
      );
      if (res.error) setError(res.error);
      else {
        setSuccess("Garantía resuelta exitosamente.");
        setTimeout(onClose, 1200);
      }
    });
  };

  // Check if cancellation is allowed (for UI hint)
  const canCancel = () => {
    if (booking.status !== "pending_approval" && booking.status !== "confirmed")
      return false;
    const cutoffHours =
      (booking.amenity as any)?.cancelation_cutoff_hours ?? 24;
    const startTime = new Date(booking.start_time).getTime();
    const hoursLeft = (startTime - Date.now()) / (1000 * 60 * 60);
    return hoursLeft >= cutoffHours;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div
          className={cn(
            "px-6 py-4 border-b flex items-center justify-between rounded-t-2xl",
            statusConfig.bgColor
          )}
        >
          <div className="flex items-center gap-2">
            <StatusIcon size={20} className={statusConfig.color} />
            <span className={cn("font-semibold", statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Booking info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Área Comunal</p>
                <p className="font-medium text-gray-900">
                  {booking.amenity?.name || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Building2 size={16} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Unidad</p>
                <p className="font-medium text-gray-900">
                  {booking.unit?.full_identifier ||
                    booking.unit?.identifier ||
                    "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User size={16} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Residente</p>
                <p className="font-medium text-gray-900">
                  {booking.profile?.full_name || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CalendarDays size={16} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Horario</p>
                <p className="text-sm text-gray-900">
                  {formatDateTime(booking.start_time)}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <ArrowRight size={10} />
                  {formatDateTime(booking.end_time)}
                </p>
              </div>
            </div>

            {booking.notes && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <span className="font-medium">Notas:</span> {booking.notes}
              </div>
            )}
          </div>

          {/* Financial info */}
          {(booking.rental_charge || booking.guarantee_charge) && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                <DollarSign size={14} />
                Información Financiera
              </h4>

              {booking.rental_charge && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-600">Costo de alquiler</span>
                  <div className="text-right">
                    <span className="font-medium">
                      {formatCurrency(booking.rental_charge.total_amount)}
                    </span>
                    <span
                      className={cn(
                        "ml-2 text-xs",
                        booking.rental_charge.status === "pagado"
                          ? "text-green-600"
                          : "text-amber-600"
                      )}
                    >
                      {booking.rental_charge.status === "pagado"
                        ? "Pagado"
                        : "Pendiente"}
                    </span>
                  </div>
                </div>
              )}

              {booking.guarantee_charge && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Shield size={12} />
                    Garantía
                  </span>
                  <div className="text-right">
                    <span className="font-medium">
                      {formatCurrency(booking.guarantee_charge.total_amount)}
                    </span>
                    {booking.guarantee_status === "held" && (
                      <span className="ml-2 text-xs text-amber-600">
                        Retenida
                      </span>
                    )}
                    {booking.guarantee_status === "applied_to_balance" && (
                      <span className="ml-2 text-xs text-green-600">
                        Saldo a favor
                      </span>
                    )}
                    {booking.guarantee_status === "refunded_externally" && (
                      <span className="ml-2 text-xs text-blue-600">
                        Devuelta
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cancellation info */}
          {booking.status === "canceled" && booking.cancellation_reason && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm text-red-600">
                <span className="font-medium">Motivo de cancelación:</span>{" "}
                {booking.cancellation_reason}
              </p>
            </div>
          )}

          {/* ACTIONS */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            {/* Pending approval: Approve / Reject */}
            {booking.status === "pending_approval" && (
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  {isPending ? "Aprobando..." : "Aprobar"}
                </button>
                <button
                  onClick={() => setShowCancelForm(true)}
                  disabled={isPending || !canCancel()}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Rechazar
                </button>
              </div>
            )}

            {/* Confirmed: Complete / Cancel */}
            {booking.status === "confirmed" && (
              <div className="flex gap-3">
                <button
                  onClick={handleComplete}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <CircleDot size={16} />
                  {isPending ? "Completando..." : "Completar Evento"}
                </button>
                <button
                  onClick={() => setShowCancelForm(true)}
                  disabled={isPending || !canCancel()}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                  title={
                    !canCancel()
                      ? "Ya pasó el tiempo límite de cancelación"
                      : ""
                  }
                >
                  <XCircle size={16} />
                  Cancelar
                </button>
              </div>
            )}

            {/* Completed with held guarantee: Resolve */}
            {booking.status === "completed" &&
              booking.guarantee_status === "held" && (
                <>
                  {!showGuaranteeForm ? (
                    <button
                      onClick={() => setShowGuaranteeForm(true)}
                      className="w-full flex items-center justify-center gap-2 bg-brand text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
                    >
                      <Shield size={16} />
                      Resolver Garantía
                    </button>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                      <h4 className="font-semibold text-gray-800 text-sm">
                        ¿Qué hacer con la garantía de{" "}
                        {formatCurrency(
                          booking.guarantee_charge?.total_amount || 0
                        )}
                        ?
                      </h4>

                      <div className="space-y-2">
                        <label
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            guaranteeResolution === "applied_to_balance"
                              ? "border-green-300 bg-green-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          )}
                        >
                          <input
                            type="radio"
                            name="guarantee_resolution"
                            value="applied_to_balance"
                            checked={
                              guaranteeResolution === "applied_to_balance"
                            }
                            onChange={() =>
                              setGuaranteeResolution("applied_to_balance")
                            }
                            className="mt-0.5"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                              <Undo2 size={14} className="text-green-600" />
                              Dejar como Saldo a Favor
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Se acredita el monto a la unidad para cubrir
                              futuras alícuotas automáticamente
                            </p>
                          </div>
                        </label>

                        <label
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            guaranteeResolution === "refunded_externally"
                              ? "border-blue-300 bg-blue-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          )}
                        >
                          <input
                            type="radio"
                            name="guarantee_resolution"
                            value="refunded_externally"
                            checked={
                              guaranteeResolution === "refunded_externally"
                            }
                            onChange={() =>
                              setGuaranteeResolution("refunded_externally")
                            }
                            className="mt-0.5"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                              <Banknote size={14} className="text-blue-600" />
                              Devolver el Dinero Físicamente
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Se registra un egreso desde una cuenta bancaria
                              (cheque o transferencia al residente)
                            </p>
                          </div>
                        </label>
                      </div>

                      {guaranteeResolution === "refunded_externally" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cuenta de origen para la devolución *
                          </label>
                          <select
                            required
                            value={selectedAccountId}
                            onChange={(e) =>
                              setSelectedAccountId(e.target.value)
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="">Seleccionar cuenta...</option>
                            {financialAccounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.bank_name} - {acc.account_number}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setShowGuaranteeForm(false)}
                          className="flex-1 px-4 py-2 text-sm text-gray-700 hover:bg-white rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleResolveGuarantee}
                          disabled={isPending}
                          className="flex-1 flex items-center justify-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
                        >
                          {isPending
                            ? "Procesando..."
                            : "Confirmar Resolución"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

            {/* Cancel form (shared for pending and confirmed) */}
            {showCancelForm &&
              (booking.status === "pending_approval" ||
                booking.status === "confirmed") && (
                <div className="bg-red-50 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-red-800 text-sm">
                    Motivo de cancelación
                  </h4>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={2}
                    placeholder="Indique el motivo..."
                    className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCancelForm(false);
                        setCancelReason("");
                      }}
                      className="flex-1 px-4 py-2 text-sm text-gray-700 hover:bg-white rounded-lg transition-colors"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      {isPending ? "Cancelando..." : "Confirmar Cancelación"}
                    </button>
                  </div>
                </div>
              )}

            {/* Info for non-cancellable */}
            {(booking.status === "pending_approval" ||
              booking.status === "confirmed") &&
              !canCancel() &&
              !showCancelForm && (
                <p className="text-xs text-gray-400 text-center">
                  El tiempo límite de cancelación ya pasó
                </p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

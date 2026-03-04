"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Palmtree,
  CalendarDays,
  Plus,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  XCircle,
  Clock,
  CircleDot,
  ChevronRight,
  Filter,
  Users,
  DollarSign,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { Amenity, Booking, BookingStatus } from "@/types/bookings";
import AmenityForm from "./AmenityForm";
import BookingDetailModal from "./BookingDetailModal";
import {
  listAmenities,
  listBookings,
  createBooking,
  toggleAmenityActive,
} from "../actions";

interface Props {
  condominiumId: string;
  initialAmenities: Amenity[];
  initialBookings: Booking[];
  units: {
    id: string;
    identifier: string;
    full_identifier: string | null;
    contact_name: string | null;
  }[];
  expenseItems: { id: string; name: string }[];
  financialAccounts: {
    id: string;
    bank_name: string;
    account_number: string;
  }[];
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; icon: typeof Clock }
> = {
  pending_approval: {
    label: "Pendiente",
    color: "bg-amber-100 text-amber-800",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmada",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  canceled: {
    label: "Cancelada",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
  completed: {
    label: "Completada",
    color: "bg-blue-100 text-blue-800",
    icon: CircleDot,
  },
};

export default function BookingsPageClient({
  condominiumId,
  initialAmenities,
  initialBookings,
  units,
  expenseItems,
  financialAccounts,
}: Props) {
  const [tab, setTab] = useState<"bookings" | "amenities">("bookings");
  const [amenities, setAmenities] = useState(initialAmenities);
  const [bookings, setBookings] = useState(initialBookings);

  // Amenity form
  const [showAmenityForm, setShowAmenityForm] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);

  // Booking form
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Filters
  const [filterAmenity, setFilterAmenity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refreshData = useCallback(() => {
    startTransition(async () => {
      const [newAmenities, newBookings] = await Promise.all([
        listAmenities(condominiumId),
        listBookings(condominiumId),
      ]);
      setAmenities(newAmenities);
      setBookings(newBookings);
    });
  }, [condominiumId]);

  const handleAmenityFormClose = () => {
    setShowAmenityForm(false);
    setEditingAmenity(null);
    refreshData();
  };

  const handleEditAmenity = (amenity: Amenity) => {
    setEditingAmenity(amenity);
    setShowAmenityForm(true);
  };

  const handleToggleAmenity = async (amenityId: string) => {
    startTransition(async () => {
      const res = await toggleAmenityActive(condominiumId, amenityId);
      if (res.error) {
        setError(res.error);
      } else {
        refreshData();
      }
    });
  };

  // Booking creation
  const [bookingForm, setBookingForm] = useState({
    amenity_id: "",
    unit_id: "",
    start_time: "",
    end_time: "",
    notes: "",
  });

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    startTransition(async () => {
      const res = await createBooking(condominiumId, bookingForm);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess("Reserva creada exitosamente.");
        setShowBookingForm(false);
        setBookingForm({
          amenity_id: "",
          unit_id: "",
          start_time: "",
          end_time: "",
          notes: "",
        });
        refreshData();
      }
    });
  };

  const handleBookingDetailClose = () => {
    setSelectedBooking(null);
    refreshData();
  };

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    if (filterAmenity && b.amenity_id !== filterAmenity) return false;
    if (filterStatus && b.status !== filterStatus) return false;
    return true;
  });

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Palmtree size={24} className="text-brand" />
            Áreas Comunales y Reservas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra áreas comunales y gestiona las reservas de los residentes
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 font-bold hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
          <button
            onClick={() => setSuccess("")}
            className="ml-2 font-bold hover:text-green-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("bookings")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            tab === "bookings"
              ? "bg-white text-brand shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <CalendarDays size={16} />
          Reservas
          {bookings.length > 0 && (
            <span className="bg-brand/10 text-brand text-xs px-1.5 py-0.5 rounded-full">
              {bookings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("amenities")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            tab === "amenities"
              ? "bg-white text-brand shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Palmtree size={16} />
          Áreas Comunales
          {amenities.length > 0 && (
            <span className="bg-brand/10 text-brand text-xs px-1.5 py-0.5 rounded-full">
              {amenities.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB: AMENITIES */}
      {tab === "amenities" && (
        <div className="space-y-4">
          {showAmenityForm ? (
            <AmenityForm
              condominiumId={condominiumId}
              amenity={editingAmenity}
              expenseItems={expenseItems}
              onClose={handleAmenityFormClose}
            />
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAmenityForm(true)}
                  className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
                >
                  <Plus size={16} />
                  Nueva Área Comunal
                </button>
              </div>

              {amenities.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                  <Palmtree
                    size={48}
                    className="mx-auto text-gray-300 mb-4"
                  />
                  <p className="text-gray-500 font-medium">
                    No hay áreas comunales configuradas
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Crea tu primera área para empezar a recibir reservas
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {amenities.map((amenity) => (
                    <div
                      key={amenity.id}
                      className={cn(
                        "bg-white rounded-xl border border-gray-200 p-5 transition-all hover:shadow-md cursor-pointer",
                        !amenity.is_active && "opacity-60"
                      )}
                      onClick={() => handleEditAmenity(amenity)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {amenity.name}
                          </h3>
                          {amenity.description && (
                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                              {amenity.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleAmenity(amenity.id);
                          }}
                          className="text-gray-400 hover:text-brand transition-colors"
                          title={
                            amenity.is_active ? "Desactivar" : "Activar"
                          }
                        >
                          {amenity.is_active ? (
                            <ToggleRight
                              size={24}
                              className="text-green-600"
                            />
                          ) : (
                            <ToggleLeft size={24} />
                          )}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          <Users size={12} />
                          {amenity.max_capacity}
                        </span>
                        {amenity.is_rentable && (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                            <DollarSign size={12} />
                            {formatCurrency(amenity.rental_cost)}
                          </span>
                        )}
                        {amenity.requires_guarantee && (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                            <Shield size={12} />
                            {formatCurrency(amenity.guarantee_amount)}
                          </span>
                        )}
                        {amenity.requires_approval && (
                          <span className="inline-flex items-center text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                            Req. Aprobación
                          </span>
                        )}
                        {!amenity.allow_debtors && (
                          <span className="inline-flex items-center text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">
                            Bloquea morosos
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: BOOKINGS */}
      {tab === "bookings" && (
        <div className="space-y-4">
          {/* Booking detail modal */}
          {selectedBooking && (
            <BookingDetailModal
              condominiumId={condominiumId}
              booking={selectedBooking}
              financialAccounts={financialAccounts}
              onClose={handleBookingDetailClose}
            />
          )}

          {/* Actions & Filters */}
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={filterAmenity}
                onChange={(e) => setFilterAmenity(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
              >
                <option value="">Todas las áreas</option>
                {amenities
                  .filter((a) => a.is_active)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
              >
                <option value="">Todos los estados</option>
                <option value="pending_approval">Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="completed">Completada</option>
                <option value="canceled">Cancelada</option>
              </select>
            </div>
            <button
              onClick={() => setShowBookingForm(!showBookingForm)}
              className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
            >
              <Plus size={16} />
              Nueva Reserva
            </button>
          </div>

          {/* Booking creation form */}
          {showBookingForm && (
            <form
              onSubmit={handleCreateBooking}
              className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
            >
              <h3 className="font-semibold text-gray-900">Nueva Reserva</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Área Comunal *
                  </label>
                  <select
                    required
                    value={bookingForm.amenity_id}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, amenity_id: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {amenities
                      .filter((a) => a.is_active)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                          {a.is_rentable
                            ? ` (${formatCurrency(a.rental_cost)})`
                            : ""}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidad *
                  </label>
                  <select
                    required
                    value={bookingForm.unit_id}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, unit_id: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_identifier || u.identifier}
                        {u.contact_name ? ` - ${u.contact_name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha/Hora Inicio *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={bookingForm.start_time}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        start_time: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha/Hora Fin *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={bookingForm.end_time}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        end_time: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, notes: e.target.value })
                    }
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Notas adicionales sobre la reserva..."
                  />
                </div>
              </div>

              {/* Info del amenity seleccionado */}
              {bookingForm.amenity_id && (() => {
                const selected = amenities.find(
                  (a) => a.id === bookingForm.amenity_id
                );
                if (!selected) return null;
                return (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <p className="font-medium text-gray-700">
                      Resumen del área: {selected.name}
                    </p>
                    <div className="flex flex-wrap gap-3 text-gray-600">
                      <span>Capacidad: {selected.max_capacity}</span>
                      {selected.is_rentable && (
                        <span>
                          Costo: {formatCurrency(selected.rental_cost)}
                        </span>
                      )}
                      {selected.requires_guarantee && (
                        <span>
                          Garantía:{" "}
                          {formatCurrency(selected.guarantee_amount)}
                        </span>
                      )}
                      <span>
                        {selected.requires_approval
                          ? "Requiere aprobación"
                          : "Auto-aprobada"}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowBookingForm(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
                >
                  {isPending ? "Creando..." : "Crear Reserva"}
                </button>
              </div>
            </form>
          )}

          {/* Bookings list */}
          {filteredBookings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <CalendarDays
                size={48}
                className="mx-auto text-gray-300 mb-4"
              />
              <p className="text-gray-500 font-medium">No hay reservas</p>
              <p className="text-gray-400 text-sm mt-1">
                {bookings.length > 0
                  ? "Ninguna reserva coincide con los filtros"
                  : "Las reservas aparecerán aquí cuando los residentes las creen"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Área
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Unidad
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Residente
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Fecha/Hora
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Estado
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Financiero
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBookings.map((booking) => {
                    const statusConfig = STATUS_CONFIG[booking.status];
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr
                        key={booking.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {booking.amenity?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {booking.unit?.full_identifier ||
                            booking.unit?.identifier ||
                            "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {booking.profile?.full_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div className="space-y-0.5">
                            <div>{formatDateTime(booking.start_time)}</div>
                            <div className="text-xs text-gray-400">
                              → {formatDateTime(booking.end_time)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                              statusConfig.color
                            )}
                          >
                            <StatusIcon size={12} />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5 text-xs text-gray-500">
                            {booking.rental_charge && (
                              <div>
                                Alquiler:{" "}
                                {formatCurrency(
                                  booking.rental_charge.total_amount
                                )}
                              </div>
                            )}
                            {booking.guarantee_charge && (
                              <div>
                                Garantía:{" "}
                                {formatCurrency(
                                  booking.guarantee_charge.total_amount
                                )}
                                {booking.guarantee_status === "held" && (
                                  <span className="ml-1 text-amber-600">
                                    (Retenida)
                                  </span>
                                )}
                                {booking.guarantee_status ===
                                  "applied_to_balance" && (
                                  <span className="ml-1 text-green-600">
                                    (Saldo a favor)
                                  </span>
                                )}
                                {booking.guarantee_status ===
                                  "refunded_externally" && (
                                  <span className="ml-1 text-blue-600">
                                    (Devuelta)
                                  </span>
                                )}
                              </div>
                            )}
                            {!booking.rental_charge &&
                              !booking.guarantee_charge && (
                                <span className="text-gray-400">
                                  Sin cargos
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight
                            size={16}
                            className="text-gray-400"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

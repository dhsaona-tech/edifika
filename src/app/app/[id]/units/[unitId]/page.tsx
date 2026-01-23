import { 
  getUnitById, 
  getSubUnits, 
  getUnitContacts, 
  unassignAccessory,
  endContactRelationship,
  toggleOccupancy,
  setPrimaryPayer,
  toggleDebtEmail,
  getActiveBudgetInfo,
  getCondoTotalAliquot,
  getActiveUnitsCount,
  getUnitChargesSummary,
} from "../actions";
import EditUnitModal from "../components/EditUnitModal";
import { 
  ArrowLeft, Building2, User, Car, Warehouse, Trash2, Plus, History, 
  Mail, CheckCircle, XCircle, Store, LogOut, Home, DoorOpen, DollarSign, Circle, Wallet 
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string; unitId: string }>;
}

export default async function UnitDetailPage({ params }: PageProps) {
  const { id: condominiumId, unitId } = await params;
  
  const unit = await getUnitById(unitId);
  if (!unit) return notFound();

  const [subUnits, contacts, activeBudget, condoTotalAliquot, activeUnitsCount, chargesSummary] = await Promise.all([
    getSubUnits(condominiumId, unit.id),
    getUnitContacts(unit.id),
    getActiveBudgetInfo(condominiumId),
    getCondoTotalAliquot(condominiumId),
    getActiveUnitsCount(condominiumId),
    getUnitChargesSummary(condominiumId, unit.id),
  ]);

  const totalAliquot = subUnits.reduce((sum, sub) => sum + Number(sub.aliquot), Number(unit.aliquot));
  const monthlyTotal = activeBudget ? activeBudget.total_annual_amount / 12 : 0;
  const method = activeBudget?.distribution_method || "por_aliquota";

  let estimatedCharge: string | null = null;
  if (activeBudget && unit.status === "activa") {
    const round2 = (n: number) => Math.round(n * 100) / 100;
    if (method === "igualitario") {
      const val = activeUnitsCount > 0 ? monthlyTotal / activeUnitsCount : 0;
      const valRounded = round2(val);
      estimatedCharge = formatCurrency(valRounded);
    } else if (method === "por_aliquota") {
      const denom = condoTotalAliquot > 0 ? condoTotalAliquot : 100;
      const val = monthlyTotal * (Number(unit.aliquot || 0) / denom);
      const valRounded = round2(val);
      estimatedCharge = formatCurrency(valRounded);
    } else {
      estimatedCharge = "Pendiente (manual)";
    }
  }

  // Lógica para etiqueta de dependencias
  let accessoriesLabel = "Dependencias";
  if (subUnits.length > 0) {
      const types = new Set(subUnits.map(s => s.type));
      if (types.size === 1) {
          const type = subUnits[0].type;
          accessoriesLabel = type.charAt(0).toUpperCase() + type.slice(1) + (subUnits.length > 1 ? "s" : "");
      } else {
          accessoriesLabel = "Dependencias";
      }
  }

  const isResidential = ['departamento', 'casa', 'oficina', 'suite_adicional', 'local'].includes(unit.type.toLowerCase());

  // --- HANDLERS ---
  const handleUnassign = async (formData: FormData) => {
    "use server";
    await unassignAccessory(condominiumId, unit.id, formData.get("accessoryId") as string);
    redirect(`/app/${condominiumId}/units/${unit.id}`); 
  };

  const handleMoveOut = async (formData: FormData) => {
    "use server";
    await endContactRelationship(condominiumId, unitId, formData.get("contactId") as string);
  };

  const handleToggleOccupancy = async (formData: FormData) => {
    "use server";
    const contactId = formData.get("contactId") as string;
    const newState = formData.get("newState") === "true";
    await toggleOccupancy(condominiumId, unitId, contactId, newState);
  };

  const handleSetPayer = async (formData: FormData) => {
    "use server";
    await setPrimaryPayer(condominiumId, unitId, formData.get("contactId") as string);
  };

  const handleToggleDebtEmail = async (formData: FormData) => {
    "use server";
    const contactId = formData.get("contactId") as string;
    const newState = formData.get("newState") === "true";
    await toggleDebtEmail(condominiumId, unitId, contactId, newState);
  };

  const getIconForType = (type: string) => {
      if (type === 'bodega') return <Warehouse size={14} className="text-orange-500"/>;
      if (type === 'local') return <Store size={14} className="text-blue-500"/>;
      return <Car size={14} className="text-gray-500"/>;
  };

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER PRINCIPAL */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link 
              href={`/app/${condominiumId}/units`}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
            >
                <ArrowLeft size={20} />
            </Link>
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-800 capitalize">
                        {unit.full_identifier || `${unit.type} ${unit.identifier}`}
                    </h1>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600 capitalize border border-gray-200">
                        {unit.type}
                    </span>
                </div>
                <p className="text-sm text-gray-500">Gestión integral del inmueble.</p>
            </div>
        </div>
        
        <EditUnitModal unit={unit} condominiumId={condominiumId} />
      </div>

      {/* GRID DE TARJETAS (similar a la referencia) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARD 1: FINANCIERO */}
        <div className="bg-white p-6 rounded-lg shadow border border-secondary-dark">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 size={16} />
                DATOS FINANCIEROS
            </h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Alícuota Base:</span>
                    <span className="font-medium text-gray-800">{Number(unit.aliquot).toFixed(2)}%</span>
                </div>
                {subUnits.length > 0 && (
                    <div className="flex justify-between items-center text-xs text-gray-500 border-b pb-2">
                        <span className="flex items-center gap-1">
                            + {subUnits.length} {accessoriesLabel}:
                        </span>
                        <span>+ {(totalAliquot - Number(unit.aliquot)).toFixed(2)}%</span>
                    </div>
                )}
                <div className="flex justify-between items-center pt-1">
                    <span className="text-gray-800 font-bold">Total generado:</span>
                    <span className="font-bold text-brand text-lg">{formatCurrency(chargesSummary.totalGenerado || 0)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-dashed">
                    <span className="text-gray-600">Saldo Pendiente:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(chargesSummary.saldoPendiente || 0)}
                    </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-dashed">
                    <div className="flex flex-col">
                        <span className="text-gray-600 text-sm">Valor de expensa mensual</span>
                        <span className="text-[11px] text-gray-500">
                            Método: {method === "manual_por_unidad" ? "Manual (pendiente)" : method === "igualitario" ? "Igualitario" : "Por % de alícuota"}
                        </span>
                    </div>
                    <span className="font-bold text-gray-900">
                        {estimatedCharge || formatCurrency(0)}
                    </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                    <Link
                      href={`/app/${condominiumId}/units/${unitId}/cartera`}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-brand border border-brand/30 px-3 py-2 rounded-md hover:bg-brand/5"
                    >
                      <Wallet size={14} /> Ver cartera
                    </Link>
                    <span className="text-[11px] text-gray-500">Próxima etapa: detalle de ordinarias, extraordinarias y multas.</span>
                </div>
            </div>
        </div>

        {/* CARD 2: RESPONSABLE */}
        <div className="bg-white p-6 rounded-lg shadow border border-secondary-dark">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User size={16} />
                RESPONSABLE ACTUAL
            </h3>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm border border-brand/20 uppercase">
                    {unit.primary_owner_name ? unit.primary_owner_name.substring(0,2) : "??"}
                </div>
                <div>
                    <p className="font-bold text-gray-800 text-sm">{unit.primary_owner_name || "Sin asignar"}</p>
                    <p className="text-xs text-gray-500">Propietario Principal</p>
                </div>
            </div>
            <div className="text-sm text-gray-600 border-t pt-3 mt-3">
                {unit.current_occupant_name ? (
                    <p className="text-sm text-gray-700">
                        <span className="text-gray-500 mr-1 font-medium text-xs uppercase">Habitan:</span>
                        {unit.current_occupant_name}
                    </p>
                ) : (
                    <p className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-1 rounded-md w-fit text-xs font-medium">
                        <DoorOpen size={14}/> Unidad Desocupada
                    </p>
                )}
            </div>
        </div>

        {/* CARD 3: DEPENDENCIAS */}
        <div className="bg-white p-6 rounded-lg shadow border border-secondary-dark flex flex-col justify-between h-full">
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Car size={16} />
                    DEPENDENCIAS ({subUnits.length})
                </h3>
                {subUnits.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No tiene asignaciones.</p>
                ) : (
                    <div className="space-y-2 max-h-[120px] overflow-y-auto">
                        {subUnits.map(sub => (
                            <div key={sub.id} className="flex items-center justify-between bg-gray-50 p-2.5 rounded border border-gray-100 group hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-2">
                                    {getIconForType(sub.type || '')}
                                    <span className="text-sm font-medium text-gray-700 capitalize">{sub.type} {sub.identifier}</span>
                                </div>
                                <form action={handleUnassign}>
                                    <input type="hidden" name="accessoryId" value={sub.id} />
                                    <button type="submit" className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1" title="Desvincular">
                                        <Trash2 size={14} />
                                    </button>
                                </form>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <Link href={`/app/${condominiumId}/units/${unitId}/assign`} className="mt-4 w-full py-2 flex items-center justify-center gap-2 text-sm text-brand font-medium border border-dashed border-brand/30 rounded-md hover:bg-brand/5 transition-colors">
                <Plus size={16} /> Asignar
            </Link>
        </div>
      </div>

      {/* SECCIÓN DE PERSONAS Y CONTACTOS */}
      <div className="bg-white rounded-lg shadow border border-secondary-dark overflow-hidden">
        {/* Header de la Tabla */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <History size={20} className="text-gray-400" />
                Personas y Contactos
            </h3>
            <div className="flex gap-3">
                <Link
                    href={`/app/${condominiumId}/units/${unitId}/register-tenant`}
                    className="text-sm px-4 py-2 bg-brand text-white hover:bg-brand-dark rounded-md transition-colors font-medium flex items-center gap-1 shadow-sm"
                >
                    <Plus size={16} /> Registrar Inquilino
                </Link>
                <Link
                    href={`/app/${condominiumId}/units/${unitId}/register-sale`}
                    className="text-sm px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors font-medium flex items-center gap-1"
                >
                    <Plus size={16} /> Nuevo Dueño (Venta)
                </Link>
            </div>
        </div>
        
        {/* TABLA ESTILIZADA */}
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase tracking-wider border-b border-gray-200">
                <tr>
                    <th className="px-6 py-3">Nombre</th>
                    <th className="px-6 py-3">Rol</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3 text-center w-28">Vive aquí</th>
                    <th className="px-6 py-3 text-center w-28">Titular Recibo</th>
                    <th className="px-6 py-3 text-center w-28">Notificaciones</th>
                    <th className="px-6 py-3">Desde</th>
                    <th className="px-6 py-3 text-right">Acción</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {contacts.map((c: any) => {
                    const isActive = !c.end_date;
                    const isOccupant = c.is_current_occupant;
                    const isPayer = c.is_primary_contact;
                    const receivesEmail = c.receives_debt_emails;
                    
                    return (
                        <tr key={c.id} className={isActive ? "bg-white hover:bg-slate-50 transition-colors group" : "bg-gray-50 opacity-60"}>
                            {/* NOMBRE */}
                            <td className="px-6 py-4 font-medium text-gray-900">
                                {c.profile?.full_name || "Usuario sin nombre"}
                                {!isActive && <span className="ml-2 text-xs text-gray-400 font-normal">(Histórico)</span>}
                            </td>

                            {/* ROL */}
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wide
                                    ${c.relationship_type === 'OWNER' ? 'bg-blue-100 text-blue-700 border-blue-100' : 
                                      c.relationship_type === 'TENANT' ? 'bg-purple-100 text-purple-700 border-purple-100' : 
                                      'bg-gray-100 text-gray-700'}`}>
                                    {c.relationship_type === 'OWNER' ? 'PROPIETARIO' : 
                                     c.relationship_type === 'DEVELOPER' ? 'CONSTRUCTORA' : 
                                     c.relationship_type === 'TENANT' ? 'INQUILINO' : c.relationship_type.toLowerCase()}
                                </span>
                            </td>

                            {/* ESTADO */}
                            <td className="px-6 py-4">
                                {isActive ? (
                                    <span className="flex items-center gap-1 text-green-600 font-medium text-xs">
                                        <CheckCircle size={14}/> Vigente
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-gray-400 font-medium text-xs">
                                        <XCircle size={14}/> Finalizado
                                    </span>
                                )}
                            </td>
                            
                            {/* VIVE AQUÍ (ICONO CHECK PROFESIONAL) */}
                            <td className="px-6 py-4 text-center align-middle">
                                {isActive ? (
                                    <form action={handleToggleOccupancy} className="flex justify-center">
                                        <input type="hidden" name="contactId" value={c.id} />
                                        <input type="hidden" name="newState" value={isOccupant ? "false" : "true"} />
                                        <button type="submit" className="focus:outline-none transition-transform active:scale-95" title={isOccupant ? "Desactivar" : "Marcar como habitante"}>
                                            {isOccupant ? (
                                                <CheckCircle className="w-6 h-6 text-green-500 fill-green-100" />
                                            ) : (
                                                <Circle className="w-6 h-6 text-gray-300 hover:text-gray-400 stroke-[1.5]" />
                                            )}
                                        </button>
                                    </form>
                                ) : <span className="text-gray-300">-</span>}
                            </td>

                            {/* TITULAR RECIBO (ICONO MEDALLA DORADA) */}
                            <td className="px-6 py-4 text-center align-middle">
                                {isActive ? (
                                    <form action={handleSetPayer} className="flex justify-center">
                                        <input type="hidden" name="contactId" value={c.id} />
                                        <button type="submit" disabled={isPayer} className={`focus:outline-none transition-transform ${!isPayer && 'active:scale-95 hover:scale-110'}`} title={isPayer ? "Es el titular actual" : "Asignar como titular"}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                                                isPayer 
                                                    ? 'bg-amber-100 border-amber-200 text-amber-600 shadow-sm' 
                                                    : 'bg-transparent border-gray-200 text-gray-300 hover:border-gray-300 hover:text-gray-400'
                                            }`}>
                                                <DollarSign className="w-4 h-4" strokeWidth={isPayer ? 2.5 : 1.5} />
                                            </div>
                                        </button>
                                    </form>
                                ) : <span className="text-gray-300">-</span>}
                            </td>

                            {/* NOTIFICACIONES (ICONO SOBRE AZUL) */}
                            <td className="px-6 py-4 text-center align-middle">
                                {isActive ? (
                                    <form action={async (formData) => {
                                        "use server";
                                        const newState = formData.get("newState") === "true";
                                        await toggleDebtEmail(condominiumId, unitId, c.id, newState);
                                    }} className="flex justify-center">
                                        <input type="hidden" name="newState" value={receivesEmail ? "false" : "true"} />
                                        <button type="submit" disabled={isPayer} className={`focus:outline-none transition-transform ${!isPayer && 'active:scale-95 hover:scale-110'}`} title={isPayer ? "Obligatorio para titular" : "Activar/Desactivar"}>
                                            <div className={`w-8 h-8 rounded-md flex items-center justify-center border ${
                                                receivesEmail 
                                                    ? (isPayer ? 'bg-blue-50 border-blue-200 text-blue-600 opacity-70 cursor-not-allowed' : 'bg-blue-100 border-blue-200 text-blue-600 shadow-sm') 
                                                    : 'bg-transparent border-gray-200 text-gray-300 hover:border-gray-300 hover:text-gray-400'
                                            }`}>
                                                <Mail className="w-4 h-4" strokeWidth={receivesEmail ? 2 : 1.5} />
                                            </div>
                                        </button>
                                    </form>
                                ) : <span className="text-gray-300">-</span>}
                            </td>

                            {/* FECHA */}
                            <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                {c.start_date ? new Date(c.start_date).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}
                            </td>
                            
                            {/* ACCIÓN FINALIZAR */}
                            <td className="px-6 py-4 text-right">
                                {isActive && (
                                    <form action={handleMoveOut}>
                                        <input type="hidden" name="contactId" value={c.id} />
                                        <button type="submit" className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full" title="Finalizar relación">
                                            <LogOut size={16} />
                                        </button>
                                    </form>
                                )}
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
        
        {contacts.length === 0 && (
            <div className="p-12 text-center text-gray-400 text-sm italic">
                No hay personas asociadas a esta unidad.
            </div>
        )}
      </div>
    </div>
  );
}

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

const unitTypeIcons: Record<string, string> = {
  departamento: "🏢",
  casa: "🏠",
  local: "🏪",
  bodega: "📦",
  parqueo: "🚗",
  otro: "🔲",
};

const unitTypeColors: Record<string, string> = {
  departamento: "bg-blue-100 text-blue-700 border-blue-200",
  casa: "bg-green-100 text-green-700 border-green-200",
  local: "bg-purple-100 text-purple-700 border-purple-200",
  bodega: "bg-orange-100 text-orange-700 border-orange-200",
  parqueo: "bg-gray-100 text-gray-700 border-gray-200",
  otro: "bg-slate-100 text-slate-700 border-slate-200",
};

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
    <div className="space-y-3 pb-6">
      {/* ========== HEADER ULTRA COMPACTO ========== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href={`/app/${condominiumId}/units`}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={18} />
          </Link>
          
          <div className="flex items-center gap-2">
            {/* Badge tipo pequeño */}
            <span className="text-lg">{unitTypeIcons[unit.type] || "🔲"}</span>
            
            {/* Título */}
            <h1 className="text-xl font-bold text-gray-900">
              {(unit.full_identifier || `${unit.type} ${unit.identifier}`).split(' ').map((word: string) => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </h1>
            
            {/* Estado */}
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              unit.status === 'activa' 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {unit.status === 'activa' ? '✓' : '○'}
            </span>
            
            {/* Alícuota */}
            <span className="text-sm text-gray-500 ml-2">
              {Number(unit.aliquot).toFixed(2)}%
            </span>
          </div>
        </div>
        
        <EditUnitModal unit={unit} condominiumId={condominiumId} />
      </div>
  
      {/* ========== CARDS ULTRA COMPACTAS ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* CARD 1: FINANCIERA */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-gray-100">
            <Building2 size={14} className="text-blue-600" />
            <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Financiera</h3>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Base</span>
              <span className="font-bold text-gray-900">{Number(unit.aliquot).toFixed(2)}%</span>
            </div>
            
            {subUnits.length > 0 && (
              <div className="bg-blue-50 rounded p-2 border border-blue-100">
                <div className="flex justify-between text-[10px] text-blue-700 mb-1">
                  <span>+{subUnits.length} dep.</span>
                  <span className="font-bold">+{(totalAliquot - Number(unit.aliquot)).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-blue-200">
                  <span className="font-bold text-blue-900">Total</span>
                  <span className="font-bold text-blue-900">{totalAliquot.toFixed(2)}%</span>
                </div>
              </div>
            )}
            
            <div className="pt-2 border-t space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Generado</span>
                <span className="font-bold text-brand">{formatCurrency(chargesSummary.totalGenerado || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pendiente</span>
                <span className="font-bold text-emerald-600">{formatCurrency(chargesSummary.saldoPendiente || 0)}</span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded p-2 border border-gray-200">
              <div className="flex justify-between mb-0.5">
                <span className="font-semibold text-gray-700">Mensual</span>
                <span className="font-bold text-gray-900">{estimatedCharge || formatCurrency(0)}</span>
              </div>
              <p className="text-[9px] text-gray-500">
                {method === "manual_por_unidad" ? "Manual" : method === "igualitario" ? "Igualitario" : "Por alícuota"}
              </p>
            </div>
            
            <Link
              href={`/app/${condominiumId}/units/${unitId}/cartera`}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded font-semibold text-[11px] hover:bg-brand-dark transition-colors"
            >
              <Wallet size={12} /> Cartera
            </Link>
          </div>
        </div>
  
        {/* CARD 2: RESPONSABLE */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-gray-100">
            <User size={14} className="text-purple-600" />
            <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Responsable</h3>
          </div>
          
          <div className="bg-brand/5 rounded p-2 border border-brand/20 mb-2">
            <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {unit.primary_owner_name ? unit.primary_owner_name.substring(0,2).toUpperCase() : "??"}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-xs leading-tight">{unit.primary_owner_name || "Sin asignar"}</p>
                <p className="text-[9px] text-brand font-semibold uppercase">Principal</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded p-2 border border-gray-200">
            <p className="text-[9px] text-gray-500 font-semibold uppercase mb-1">Ocupación</p>
            {unit.current_occupant_name ? (
              <div className="flex items-center gap-1.5">
                <Home size={12} className="text-emerald-600" />
                <div>
                  <p className="font-semibold text-gray-900 text-xs">{unit.current_occupant_name}</p>
                  <p className="text-[9px] text-gray-500">Habitando</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-600">
                <DoorOpen size={14} />
                <span className="font-semibold text-xs">Desocupada</span>
              </div>
            )}
          </div>
        </div>
  
        {/* CARD 3: DEPENDENCIAS */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-col">
          <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-gray-100">
            <Car size={14} className="text-orange-600" />
            <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Dependencias ({subUnits.length})</h3>
          </div>
          
          <div className="flex-1">
            {subUnits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Car size={20} className="text-gray-400 mb-2" />
                <p className="text-[10px] text-gray-500 font-medium">Sin dependencias</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {subUnits.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-2 rounded border border-gray-200 group">
                    <div className="flex items-center gap-2">
                      {getIconForType(sub.type || '')}
                      <div>
                        <p className="text-xs font-semibold text-gray-900 capitalize">{sub.type} {sub.identifier}</p>
                        <p className="text-[9px] text-gray-500">{Number(sub.aliquot || 0).toFixed(2)}%</p>
                      </div>
                    </div>
                    <form action={handleUnassign}>
                      <input type="hidden" name="accessoryId" value={sub.id} />
                      <button 
                        type="submit" 
                        className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-50 rounded" 
                      >
                        <Trash2 size={12} />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <Link 
            href={`/app/${condominiumId}/units/${unitId}/assign`} 
            className="mt-2 w-full py-1.5 flex items-center justify-center gap-1.5 text-xs text-brand font-semibold border-2 border-dashed border-brand/30 rounded hover:bg-brand/5 hover:border-brand/50 transition-all"
          >
            <Plus size={14} /> Asignar
          </Link>
        </div>
      </div>
  
      {/* ========== TABLA DE CONTACTOS COMPACTA ========== */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-brand" />
            <h3 className="text-sm font-bold text-gray-900">Personas y Contactos</h3>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/app/${condominiumId}/units/${unitId}/register-tenant`}
              className="text-xs px-3 py-1.5 bg-brand text-white hover:bg-brand-dark rounded font-semibold flex items-center gap-1"
            >
              <Plus size={12} /> Inquilino
            </Link>
            <Link
              href={`/app/${condominiumId}/units/${unitId}/register-sale`}
              className="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded font-semibold flex items-center gap-1"
            >
              <Plus size={12} /> Venta
            </Link>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-600 uppercase">Nombre</th>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-600 uppercase">Rol</th>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-600 uppercase">Estado</th>
                <th className="px-3 py-2 text-center text-[9px] font-bold text-gray-600 uppercase w-20">Vive</th>
                <th className="px-3 py-2 text-center text-[9px] font-bold text-gray-600 uppercase w-20">Paga</th>
                <th className="px-3 py-2 text-center text-[9px] font-bold text-gray-600 uppercase w-20">Email</th>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-600 uppercase">Desde</th>
                <th className="px-3 py-2 text-right text-[9px] font-bold text-gray-600 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((c: any) => {
                const isActive = !c.end_date;
                const isOccupant = c.is_current_occupant;
                const isPayer = c.is_primary_contact;
                const receivesEmail = c.receives_debt_emails;
                
                return (
                  <tr key={c.id} className={isActive ? "bg-white hover:bg-gray-50 group" : "bg-gray-50 opacity-60"}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-brand rounded-full flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                          {(c.profile?.full_name || "?").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 leading-tight">{c.profile?.full_name || "Sin nombre"}</p>
                          {!isActive && <p className="text-[9px] text-gray-400">Histórico</p>}
                        </div>
                      </div>
                    </td>
  
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        c.relationship_type === 'OWNER' ? 'bg-blue-100 text-blue-700' : 
                        c.relationship_type === 'TENANT' ? 'bg-purple-100 text-purple-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {c.relationship_type === 'OWNER' ? 'Prop.' : 
                         c.relationship_type === 'TENANT' ? 'Inq.' : 
                         c.relationship_type}
                      </span>
                    </td>
  
                    <td className="px-3 py-2">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[10px]">
                          <CheckCircle size={11} /> Vigente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 text-[10px]">
                          <XCircle size={11} /> Fin
                        </span>
                      )}
                    </td>
                    
                    <td className="px-3 py-2 text-center">
                      {isActive ? (
                        <form action={handleToggleOccupancy} className="flex justify-center">
                          <input type="hidden" name="contactId" value={c.id} />
                          <input type="hidden" name="newState" value={isOccupant ? "false" : "true"} />
                          <button type="submit">
                            {isOccupant ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500 fill-emerald-100" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" strokeWidth={1.5} />
                            )}
                          </button>
                        </form>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
  
                    <td className="px-3 py-2 text-center">
                      {isActive ? (
                        <form action={handleSetPayer} className="flex justify-center">
                          <input type="hidden" name="contactId" value={c.id} />
                          <button type="submit" className="cursor-pointer">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                              isPayer 
                                ? 'bg-amber-100 border-amber-300 text-amber-600' 
                                : 'bg-white border-gray-200 text-gray-300 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-500'
                            }`}>
                              <DollarSign className="w-3 h-3" strokeWidth={isPayer ? 2.5 : 1.5} />
                            </div>
                          </button>
                        </form>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
  
                    <td className="px-3 py-2 text-center">
                      {isActive ? (
                        <form action={handleToggleDebtEmail} className="flex justify-center">
                          <input type="hidden" name="contactId" value={c.id} />
                          <input type="hidden" name="newState" value={receivesEmail ? "false" : "true"} />
                          <button type="submit" disabled={isPayer}>
                            <div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${
                              receivesEmail 
                                ? (isPayer ? 'bg-blue-50 border-blue-200 text-blue-600 opacity-70' : 'bg-blue-100 border-blue-300 text-blue-600')
                                : 'bg-white border-gray-200 text-gray-300 hover:border-gray-400'
                            }`}>
                              <Mail className="w-3 h-3" strokeWidth={receivesEmail ? 2 : 1.5} />
                            </div>
                          </button>
                        </form>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
  
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-mono text-gray-600">
                        {c.start_date ? new Date(c.start_date).toLocaleDateString('es-ES') : '—'}
                      </span>
                    </td>
                    
                    <td className="px-3 py-2 text-right">
                      {isActive && (
                        <form action={handleMoveOut}>
                          <input type="hidden" name="contactId" value={c.id} />
                          <button 
                            type="submit" 
                            className="text-gray-300 hover:text-red-600 p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100"
                          >
                            <LogOut size={12} />
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {contacts.length === 0 && (
          <div className="p-8 text-center">
            <User size={20} className="text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No hay contactos</p>
          </div>
        )}
      </div>
    </div>
  )};
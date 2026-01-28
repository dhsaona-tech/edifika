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
      <div className="space-y-6 pb-10">
        {/* ========== HEADER MEJORADO ========== */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Link 
              href={`/app/${condominiumId}/units`}
              className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-all mt-1"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-2">
                {/* Badge de tipo con icono */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${unitTypeColors[unit.type] || unitTypeColors.otro}`}>
                  <span className="text-lg">{unitTypeIcons[unit.type] || "🔲"}</span>
                  <span className="capitalize">{unit.type}</span>
                </div>
                
                {/* Badge de estado */}
                <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  unit.status === 'activa' 
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                  {unit.status === 'activa' ? '✓ Activa' : '○ Inactiva'}
                </span>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                {unit.full_identifier || `${unit.type} ${unit.identifier}`}
              </h1>
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {unit.floor && (
                  <span className="flex items-center gap-1.5">
                    <Building2 size={14} />
                    Piso {unit.floor}
                  </span>
                )}
                {unit.area_m2 && (
                  <span className="flex items-center gap-1.5">
                    <Home size={14} />
                    {unit.area_m2}m²
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <DollarSign size={14} />
                  Alícuota: {Number(unit.aliquot).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          
          <EditUnitModal unit={unit} condominiumId={condominiumId} />
        </div>
  
        {/* ========== CARDS FINANCIERAS MEJORADAS ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CARD 1: INFORMACIÓN FINANCIERA */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 size={16} className="text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Información Financiera
              </h3>
            </div>
            
            <div className="space-y-4">
              {/* Alícuota base */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Alícuota Base</span>
                <span className="text-lg font-bold text-gray-900">{Number(unit.aliquot).toFixed(2)}%</span>
              </div>
              
              {/* Dependencias */}
              {subUnits.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex justify-between items-center text-xs text-blue-700 mb-1.5">
                    <span className="font-semibold">+ {subUnits.length} {accessoriesLabel}</span>
                    <span className="font-bold">+{(totalAliquot - Number(unit.aliquot)).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-blue-200">
                    <span className="text-sm font-bold text-blue-900">Total Alícuota</span>
                    <span className="text-lg font-bold text-blue-900">{totalAliquot.toFixed(2)}%</span>
                  </div>
                </div>
              )}
              
              {/* Total generado */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Generado</span>
                  <span className="text-xl font-bold text-brand">
                    {formatCurrency(chargesSummary.totalGenerado || 0)}
                  </span>
                </div>
              </div>
              
              {/* Saldo pendiente */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Saldo Pendiente</span>
                <span className="text-lg font-bold text-emerald-600">
                  {formatCurrency(chargesSummary.saldoPendiente || 0)}
                </span>
              </div>
              
              {/* Expensa mensual */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-gray-700">Expensa Mensual</span>
                  <span className="text-lg font-bold text-gray-900">
                    {estimatedCharge || formatCurrency(0)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Método: {method === "manual_por_unidad" ? "Manual" : method === "igualitario" ? "Igualitario" : "Por alícuota"}
                </p>
              </div>
              
              {/* Botón ver cartera */}
              <Link
                href={`/app/${condominiumId}/units/${unitId}/cartera`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg font-semibold text-sm hover:bg-brand-dark transition-colors shadow-sm"
              >
                <Wallet size={16} /> Ver Cartera Completa
              </Link>
            </div>
          </div>
  
          {/* CARD 2: RESPONSABLE */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <User size={16} className="text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Responsable Actual
              </h3>
            </div>
            
            {/* Propietario */}
            <div className="bg-gradient-to-br from-brand/5 to-brand/10 rounded-lg p-4 border border-brand/20 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {unit.primary_owner_name ? unit.primary_owner_name.substring(0,2).toUpperCase() : "??"}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{unit.primary_owner_name || "Sin asignar"}</p>
                  <p className="text-xs text-brand font-semibold uppercase tracking-wide">Propietario Principal</p>
                </div>
              </div>
            </div>
            
            {/* Ocupante actual */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Estado de Ocupación</p>
              {unit.current_occupant_name ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Home size={14} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{unit.current_occupant_name}</p>
                    <p className="text-xs text-gray-500">Habitando actualmente</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
                  <DoorOpen size={18} />
                  <span className="font-semibold text-sm">Unidad Desocupada</span>
                </div>
              )}
            </div>
          </div>
  
          {/* CARD 3: DEPENDENCIAS */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Car size={16} className="text-orange-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Dependencias ({subUnits.length})
              </h3>
            </div>
            
            <div className="flex-1">
              {subUnits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Car size={24} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Sin dependencias asignadas</p>
                  <p className="text-xs text-gray-400 mt-1">Agrega bodegas o parqueos</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto">
                  {subUnits.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-3 rounded-lg border border-gray-200 group transition-colors">
                      <div className="flex items-center gap-3">
                        {getIconForType(sub.type || '')}
                        <div>
                          <p className="text-sm font-semibold text-gray-900 capitalize">{sub.type} {sub.identifier}</p>
                          <p className="text-xs text-gray-500">Alícuota: {Number(sub.aliquot || 0).toFixed(2)}%</p>
                        </div>
                      </div>
                      <form action={handleUnassign}>
                        <input type="hidden" name="accessoryId" value={sub.id} />
                        <button 
                          type="submit" 
                          className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-red-50 rounded" 
                          title="Desvincular"
                        >
                          <Trash2 size={16} />
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Link 
              href={`/app/${condominiumId}/units/${unitId}/assign`} 
              className="mt-4 w-full py-2.5 flex items-center justify-center gap-2 text-sm text-brand font-semibold border-2 border-dashed border-brand/30 rounded-lg hover:bg-brand/5 hover:border-brand/50 transition-all"
            >
              <Plus size={18} /> Asignar Dependencia
            </Link>
          </div>
        </div>
  
        {/* ========== TABLA DE CONTACTOS (MANTIENE TU ESTRUCTURA) ========== */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center">
                <History size={20} className="text-brand" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Personas y Contactos</h3>
                <p className="text-sm text-gray-500">Historial completo de propietarios e inquilinos</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/app/${condominiumId}/units/${unitId}/register-tenant`}
                className="text-sm px-4 py-2 bg-brand text-white hover:bg-brand-dark rounded-lg transition-colors font-semibold flex items-center gap-2 shadow-sm"
              >
                <Plus size={16} /> Registrar Inquilino
              </Link>
              <Link
                href={`/app/${condominiumId}/units/${unitId}/register-sale`}
                className="text-sm px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-brand rounded-lg transition-colors font-semibold flex items-center gap-2"
              >
                <Plus size={16} /> Nueva Venta
              </Link>
            </div>
          </div>
          
          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-28">Vive aquí</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-28">Facturación</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-28">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Desde</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map((c: any) => {
                  const isActive = !c.end_date;
                  const isOccupant = c.is_current_occupant;
                  const isPayer = c.is_primary_contact;
                  const receivesEmail = c.receives_debt_emails;
                  
                  return (
                    <tr key={c.id} className={isActive ? "bg-white hover:bg-gray-50 transition-colors group" : "bg-gray-50 opacity-60"}>
                      {/* NOMBRE */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {(c.profile?.full_name || "?").substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{c.profile?.full_name || "Usuario sin nombre"}</p>
                            {!isActive && <p className="text-xs text-gray-400">Histórico</p>}
                          </div>
                        </div>
                      </td>
  
                      {/* ROL */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          c.relationship_type === 'OWNER' ? 'bg-blue-100 text-blue-700' : 
                          c.relationship_type === 'TENANT' ? 'bg-purple-100 text-purple-700' : 
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {c.relationship_type === 'OWNER' ? 'Propietario' : 
                           c.relationship_type === 'TENANT' ? 'Inquilino' : 
                           c.relationship_type}
                        </span>
                      </td>
  
                      {/* ESTADO */}
                      <td className="px-6 py-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold text-xs">
                            <CheckCircle size={14} /> Vigente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-gray-400 font-medium text-xs">
                            <XCircle size={14} /> Finalizado
                          </span>
                        )}
                      </td>
                      
                      {/* VIVE AQUÍ */}
                      <td className="px-6 py-4 text-center">
                        {isActive ? (
                          <form action={handleToggleOccupancy} className="flex justify-center">
                            <input type="hidden" name="contactId" value={c.id} />
                            <input type="hidden" name="newState" value={isOccupant ? "false" : "true"} />
                            <button type="submit" className="focus:outline-none transition-all hover:scale-110 active:scale-95">
                              {isOccupant ? (
                                <CheckCircle className="w-6 h-6 text-emerald-500 fill-emerald-100" />
                              ) : (
                                <Circle className="w-6 h-6 text-gray-300 hover:text-gray-400" strokeWidth={1.5} />
                              )}
                            </button>
                          </form>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
  
                      {/* FACTURACIÓN */}
                      <td className="px-6 py-4 text-center">
                        {isActive ? (
                          <form action={handleSetPayer} className="flex justify-center">
                            <input type="hidden" name="contactId" value={c.id} />
                            <button 
                              type="submit" 
                              disabled={isPayer}
                              className={`focus:outline-none transition-all ${!isPayer && 'hover:scale-110 active:scale-95'}`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                                isPayer 
                                  ? 'bg-amber-100 border-amber-300 text-amber-600 shadow-sm' 
                                  : 'bg-white border-gray-200 text-gray-300 hover:border-gray-400 hover:text-gray-400'
                              }`}>
                                <DollarSign className="w-4 h-4" strokeWidth={isPayer ? 2.5 : 1.5} />
                              </div>
                            </button>
                          </form>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
  
                      {/* EMAIL */}
                      <td className="px-6 py-4 text-center">
                        {isActive ? (
                          <form action={handleToggleDebtEmail} className="flex justify-center">
                            <input type="hidden" name="contactId" value={c.id} />
                            <input type="hidden" name="newState" value={receivesEmail ? "false" : "true"} />
                            <button 
                              type="submit"
                              disabled={isPayer}
                              className={`focus:outline-none transition-all ${!isPayer && 'hover:scale-110 active:scale-95'}`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 ${
                                receivesEmail 
                                  ? (isPayer ? 'bg-blue-50 border-blue-200 text-blue-600 opacity-70' : 'bg-blue-100 border-blue-300 text-blue-600 shadow-sm')
                                  : 'bg-white border-gray-200 text-gray-300 hover:border-gray-400 hover:text-gray-400'
                              }`}>
                                <Mail className="w-4 h-4" strokeWidth={receivesEmail ? 2 : 1.5} />
                              </div>
                            </button>
                          </form>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
  
                      {/* FECHA */}
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-gray-600">
                          {c.start_date ? new Date(c.start_date).toLocaleDateString('es-ES') : '—'}
                        </span>
                      </td>
                      
                      {/* ACCIÓN */}
                      <td className="px-6 py-4 text-right">
                        {isActive && (
                          <form action={handleMoveOut}>
                            <input type="hidden" name="contactId" value={c.id} />
                            <button 
                              type="submit" 
                              className="text-gray-300 hover:text-red-600 transition-all p-2 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100"
                            >
                              <LogOut size={16} />
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
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-900 font-semibold mb-1">No hay contactos asociados</p>
              <p className="text-sm text-gray-500">Comienza registrando un propietario o inquilino</p>
            </div>
          )}
        </div>
      </div>
    );
  }
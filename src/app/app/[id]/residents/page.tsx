import { getResidents } from "./actions";
import CreateResidentModal from "./components/CreateResidentModal";
import ResidentsTable from "./components/ResidentsTable";
import ResidentsToolbar from "./components/ResidentsToolbar";
import { createClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ query?: string; role?: string; hasUnit?: string }>;
}

export default async function ResidentsPage({ params, searchParams }: PageProps) {
  const { id: condominiumId } = await params;
  const { query, role, hasUnit } = await searchParams;

  // Normalizar filtros
  const roleFilter = role === "owner" || role === "tenant" ? role : "all";
  const hasUnitFilter = hasUnit === "yes" || hasUnit === "no" ? hasUnit : "all";

  const residents = await getResidents(condominiumId, query, roleFilter, hasUnitFilter);
  
  // Data para modal
  const supabase = await createClient();
  const { data: unitsRaw } = await supabase
    .from("units")
    .select("id, identifier, block_identifier, type")
    .eq("condominium_id", condominiumId)
    .order("identifier");

  const availableUnits = (unitsRaw || []).map((u: any) => ({
    id: u.id,
    name: u.block_identifier 
      ? `${u.block_identifier} ${u.identifier}` 
      : `${u.type} ${u.identifier}`
  }));

  return (
    <div className="space-y-3">
      
      {/* --- HEADER COMPACTO (IGUAL A UNITS) --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-800 tracking-tight">Directorio de Residentes</h1>
            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-medium border border-gray-200">
                {residents.length}
            </span>
          </div>
        </div>
        
        {/* El botón de Nuevo Residente ya viene estilizado dentro del componente */}
        <CreateResidentModal condominiumId={condominiumId} availableUnits={availableUnits} />
      </div>

      {/* --- TOOLBAR UNIFICADA --- */}
      <ResidentsToolbar condominiumId={condominiumId} />

      {/* --- TABLA --- */}
      <div className="bg-white rounded-lg shadow border border-secondary-dark overflow-hidden">
        {residents.length === 0 ? (
          <div className="bg-white p-8 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-2 text-gray-300">
              <Users size={20} />
            </div>
            <p className="text-xs text-gray-500">
              {query ? "No se encontraron resultados." : "No hay residentes registrados."}
            </p>
          </div>
        ) : (
          <ResidentsTable residents={residents} condominiumId={condominiumId} />
        )}
      </div>
    </div>
  );
}

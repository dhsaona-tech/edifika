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
      {/* Header compacto - como Unidades */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Directorio</h1>
          <p className="text-[11px] text-gray-500">Residentes, propietarios e inquilinos del condominio</p>
        </div>
        <CreateResidentModal condominiumId={condominiumId} availableUnits={availableUnits} />
      </div>

      {/* Filtros compactos */}
      <div className="bg-white rounded-lg border border-gray-200 p-2.5 shadow-sm">
        <ResidentsToolbar condominiumId={condominiumId} />
      </div>

      {/* Tabla compacta */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {residents.length === 0 ? (
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <div className="w-9 h-9 bg-brand/10 rounded-lg flex items-center justify-center mb-1.5">
              <Users size={18} className="text-brand" strokeWidth={2} />
            </div>
            <p className="text-[11px] font-semibold text-gray-900 mb-0.5">
              {query ? "No se encontraron resultados" : "No hay residentes"}
            </p>
            <p className="text-[10px] text-gray-500">
              {query ? "Prueba otros filtros o búsqueda." : "Registra el primer residente."}
            </p>
          </div>
        ) : (
          <>
            <ResidentsTable residents={residents} condominiumId={condominiumId} />
            <div className="bg-gray-50 px-3 py-1.5 border-t border-gray-200">
              <p className="text-[10px] text-gray-500">
                <span className="font-semibold text-gray-900">{residents.length}</span>{" "}
                {residents.length === 1 ? "residente" : "residentes"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

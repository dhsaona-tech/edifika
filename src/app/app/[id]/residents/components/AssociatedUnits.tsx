import { UnitContact } from "@/types";
import Link from "next/link";

interface AssociatedUnitsProps {
  history: UnitContact[]; 
}

export default function AssociatedUnits({ history }: AssociatedUnitsProps) {
  const activeUnits = history.filter((h) => !h.end_date);
  const pastUnits = history.filter((h) => h.end_date);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-secondary-dark overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Unidades Asociadas</h3>
      </div>

      <div className="p-2">
        {/* ACTIVAS */}
        {activeUnits.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400 italic">Sin unidades activas.</div>
        ) : (
          <div className="space-y-1">
            {activeUnits.map((record) => (
              <UnitRow key={record.id} record={record} isActive={true} />
            ))}
          </div>
        )}

        {/* HISTORIAL */}
        {pastUnits.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <h4 className="px-2 text-[10px] font-bold text-gray-400 uppercase mb-2">Historial</h4>
            <div className="space-y-1 opacity-70">
              {pastUnits.map((record) => (
                <UnitRow key={record.id} record={record} isActive={false} />
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Botón Footer (Opcional) */}
      <div className="p-2 border-t border-gray-100">
         <button className="w-full py-1.5 text-xs font-medium text-brand hover:bg-purple-50 rounded transition-colors">
            + Vincular Unidad
         </button>
      </div>
    </div>
  );
}

function UnitRow({ record, isActive }: { record: UnitContact; isActive: boolean }) {
  const unitName = record.unit?.block_identifier 
      ? `${record.unit.block_identifier} ${record.unit.identifier}`
      : `${record.unit?.type || 'Unidad'} ${record.unit?.identifier}`;

  const roleLabel = record.relationship_type === 'OWNER' ? 'Propietario' : 'Inquilino';
  const colorClass = record.relationship_type === 'OWNER' 
    ? 'bg-purple-100 text-brand border-purple-200' 
    : 'bg-blue-100 text-blue-700 border-blue-200';

  return (
    <div className={`group flex items-center justify-between p-2 rounded-md border ${isActive ? 'bg-white border-gray-200 hover:border-brand/50' : 'bg-gray-50 border-transparent'}`}>
      <div className="flex flex-col">
        <span className="text-xs font-bold text-gray-800 group-hover:text-brand transition-colors">{unitName}</span>
        <span className="text-[10px] text-gray-500">
            {new Date(record.start_date || '').toLocaleDateString()}
        </span>
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-semibold ${colorClass}`}>
        {roleLabel}
      </span>
    </div>
  );
}
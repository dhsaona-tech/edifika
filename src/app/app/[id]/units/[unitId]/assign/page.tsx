import { getUnitById, getAvailableAccessories, assignAccessory } from "../../actions";
import { ArrowLeft, Car, Warehouse, PlusCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string; unitId: string }>;
}

export default async function AssignAccessoryPage({ params }: PageProps) {
  const { id, unitId } = await params;

  // 1. Buscamos la unidad Padre (Departamento/Casa)
  const parentUnit = await getUnitById(unitId);
  if (!parentUnit) return notFound();

  // 2. Buscamos qué hay disponible (Parqueaderos/Bodegas sueltos)
  const availableUnits = await getAvailableAccessories(id);

  // Action del formulario
  const handleAssign = async (formData: FormData) => {
    "use server";
    const accessoryId = formData.get("accessoryId") as string;
    await assignAccessory(id, unitId, accessoryId);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href={`/app/${id}/units/${unitId}`}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Asignar Dependencia</h1>
          <p className="text-sm text-gray-500">
            Vincula un parqueadero o bodega a <span className="font-semibold text-gray-900">{parentUnit.full_identifier || parentUnit.identifier}</span>.
          </p>
        </div>
      </div>

      {/* Lista de Disponibles */}
      <div className="bg-white rounded-lg shadow border border-secondary-dark overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-secondary-dark flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Disponibles para asignar</h3>
            <span className="text-xs bg-white border px-2 py-0.5 rounded-full text-gray-500 font-medium">
                {availableUnits.length} encontrados
            </span>
        </div>

        {availableUnits.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
                    <AlertCircle size={24} />
                </div>
                <p className="text-gray-900 font-medium">No hay unidades disponibles</p>
                <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                    No encontramos parqueaderos o bodegas libres. Debes crearlos primero en la opción "Nueva Unidad".
                </p>
                <Link 
                    href={`/app/${id}/units/new`} 
                    className="mt-4 text-brand text-sm font-semibold hover:underline underline-offset-4"
                >
                    Ir a crear Parqueadero &rarr;
                </Link>
            </div>
        ) : (
            <ul className="divide-y divide-gray-100">
                {availableUnits.map((item) => (
                    <li key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                item.type === 'bodega' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                                {item.type === 'bodega' ? <Warehouse size={18}/> : <Car size={18}/>}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">{item.identifier}</p>
                                <div className="flex items-center gap-2 text-xs mt-0.5">
                                    <span className="bg-white border px-2 py-0.5 rounded text-gray-500 capitalize shadow-sm">
                                        {item.type}
                                    </span>
                                    {Number(item.aliquot) > 0 && (
                                        <span className="text-brand font-medium bg-brand/5 px-2 py-0.5 rounded">
                                            +{Number(item.aliquot)}% alícuota
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <form action={handleAssign}>
                            <input type="hidden" name="accessoryId" value={item.id} />
                            <button 
                                type="submit"
                                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand hover:bg-white hover:shadow-sm px-4 py-2 rounded-md transition-all border border-transparent hover:border-gray-200"
                            >
                                <PlusCircle size={16} />
                                Asignar
                            </button>
                        </form>
                    </li>
                ))}
            </ul>
        )}
      </div>
    </div>
  );
}
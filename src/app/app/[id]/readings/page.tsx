import Link from "next/link";
import { listUtilityBills } from "./actions";
import UtilityBillsTable from "./components/UtilityBillsTable";
import { Plus } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; status?: string; expenseItemId?: string }>;
}

export default async function ReadingsPage({ params, searchParams }: PageProps) {
  const { id: condominiumId } = await params;
  const filters = await searchParams;

  const { bills, count } = await listUtilityBills(condominiumId, {
    period: filters.period,
    status: filters.status,
    expenseItemId: filters.expenseItemId,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lecturas de Servicios</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las lecturas de agua, luz, gas y otros servicios.
          </p>
        </div>
        <Link
          href={`/app/${condominiumId}/readings/new`}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 text-xs font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          Nueva Lectura
        </Link>
      </div>

      {/* Tabla */}
      <UtilityBillsTable bills={bills} condominiumId={condominiumId} />

      {/* Conteo */}
      <p className="text-xs text-gray-400">{count} lectura(s) encontrada(s)</p>
    </div>
  );
}

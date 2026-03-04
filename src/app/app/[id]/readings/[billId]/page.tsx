import Link from "next/link";
import { getUtilityBill, getParentUnitsForReadings } from "../actions";
import BillHeader from "./components/BillHeader";
import BillStatusActions from "./components/BillStatusActions";
import ReadingsGrid from "./components/ReadingsGrid";
import AllocationGrid from "./components/AllocationGrid";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string; billId: string }>;
}

export default async function BillDetailPage({ params }: PageProps) {
  const { id: condominiumId, billId } = await params;

  const bill = await getUtilityBill(condominiumId, billId);

  if (!bill) {
    return (
      <div className="space-y-6">
        <Link
          href={`/app/${condominiumId}/readings`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand"
        >
          <ArrowLeft size={14} />
          Volver a lecturas
        </Link>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-sm text-gray-500">Lectura no encontrada.</p>
        </div>
      </div>
    );
  }

  // For allocation mode, get parent units
  let allocationUnits: { id: string; identifier: string; full_identifier: string | null; aliquot: number }[] = [];
  if (bill.mode === "allocation") {
    const units = await getParentUnitsForReadings(condominiumId);
    allocationUnits = units.map((u) => ({
      id: u.id,
      identifier: u.identifier,
      full_identifier: u.full_identifier,
      aliquot: u.aliquot ?? 0,
    }));
  }

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href={`/app/${condominiumId}/readings`}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand transition-colors"
      >
        <ArrowLeft size={14} />
        Volver a lecturas
      </Link>

      {/* Header */}
      <BillHeader bill={bill} condominiumId={condominiumId} />

      {/* Status + Actions */}
      <BillStatusActions bill={bill} condominiumId={condominiumId} />

      {/* Grid (meter_based or allocation) */}
      {bill.mode === "meter_based" ? (
        <ReadingsGrid bill={bill} condominiumId={condominiumId} />
      ) : (
        <AllocationGrid bill={bill} units={allocationUnits} />
      )}
    </div>
  );
}

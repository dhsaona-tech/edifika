import { getUnitsForDistribution } from "../../budget/actions";
import NewPaymentAgreementForm from "../components/NewPaymentAgreementForm";
import { Handshake, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ unit_id?: string }>;
}

export default async function NewPaymentAgreementPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { unit_id } = await searchParams;

  const units = await getUnitsForDistribution(id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
        <Link
          href={`/app/${id}/payment-agreements`}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-brand hover:border-brand/30 transition-all shadow-sm"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center border border-amber-200">
            <Handshake size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Nuevo Convenio de Pago
            </h1>
            <p className="text-xs text-gray-500">
              Refinancia la deuda de una unidad en cuotas
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <NewPaymentAgreementForm
        condominiumId={id}
        units={units}
        preselectedUnitId={unit_id}
      />
    </div>
  );
}

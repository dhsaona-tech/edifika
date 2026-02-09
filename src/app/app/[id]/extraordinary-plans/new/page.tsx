import { getExpenseItemsPadre } from "../../budget/actions";
import { getUnitsForDistribution } from "../../budget/actions";
import NewExtraordinaryPlanForm from "../components/NewExtraordinaryPlanForm";
import { Layers, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewExtraordinaryPlanPage({ params }: PageProps) {
  const { id } = await params;

  const [expenseItems, units] = await Promise.all([
    getExpenseItemsPadre(id),
    getUnitsForDistribution(id),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
        <Link
          href={`/app/${id}/extraordinary-plans`}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-brand hover:border-brand/30 transition-all shadow-sm"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center border border-purple-200">
            <Layers size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Nuevo Plan Extraordinario
            </h1>
            <p className="text-xs text-gray-500">
              Define cuotas extraordinarias para un proyecto especial
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <NewExtraordinaryPlanForm
        condominiumId={id}
        expenseItems={expenseItems}
        units={units}
      />
    </div>
  );
}

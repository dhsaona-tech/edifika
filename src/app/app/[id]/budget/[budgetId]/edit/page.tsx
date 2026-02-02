import BudgetForm from "../../components/BudgetForm";
import { getBudgetDetail, getExpenseItemsPadre } from "../../actions";
import BackButton from "@/components/ui/BackButton";

type PageProps = { params: { id: string; budgetId: string } | Promise<{ id: string; budgetId: string }> };

export default async function EditBudgetPage({ params }: PageProps) {
  const resolved = await params;
  const { id: condominiumId, budgetId } = resolved;

  const detail = await getBudgetDetail(budgetId);
  if (!detail) return <div className="text-sm text-gray-500">Presupuesto no encontrado.</div>;

  const rubrosPadre = await getExpenseItemsPadre(condominiumId);

  const presupuestoInicial = {
    budgetId: detail.master.id,
    name: detail.master.name,
    year: detail.master.year,
    budget_type: detail.master.budget_type,
    status: detail.master.status,
    distribution_method: detail.master.distribution_method,
    total_annual_amount: detail.master.total_annual_amount,
    rubros: detail.rubros?.map((r) => ({
      expense_item_id: r.expense_item_id,
      annual_amount: r.annual_amount,
      name: r.name,
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton href={`/app/${condominiumId}/budget/${budgetId}`} />
          <div>
            <h1 className="text-2xl font-semibold">Editar presupuesto</h1>
            <p className="text-sm text-muted-foreground">Actualiza valores y distribución.</p>
          </div>
        </div>
      </div>
      <BudgetForm condominiumId={condominiumId} rubrosPadre={rubrosPadre} presupuesto={presupuestoInicial} />
    </div>
  );
}

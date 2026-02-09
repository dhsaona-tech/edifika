import BudgetForm from "../components/BudgetForm";
import { getExpenseItemsPadre } from "../actions";
import BackButton from "@/components/ui/BackButton";

type PageProps = { params: { id: string } | Promise<{ id: string }> };

export default async function NewBudgetPage({ params }: PageProps) {
  const resolved = await params;
  const condominiumId = resolved.id;
  const rubrosPadre = await getExpenseItemsPadre(condominiumId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton href={`/app/${condominiumId}/budget`} />
          <div>
            <h1 className="text-2xl font-semibold">Nuevo presupuesto</h1>
            <p className="text-sm text-muted-foreground">
              Define el presupuesto anual (global o detallado) y el método de distribución.
            </p>
          </div>
        </div>
      </div>
      <BudgetForm condominiumId={condominiumId} rubrosPadre={rubrosPadre} />
    </div>
  );
}

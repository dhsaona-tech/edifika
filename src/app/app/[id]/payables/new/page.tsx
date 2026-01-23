import { getExpenseItemsGasto, getSuppliersBasic } from "../actions";
import RegisterPayableForm from "../components/RegisterPayableForm";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: { id: string } | Promise<{ id: string }> };

export default async function NewPayablePage({ params }: PageProps) {
  const resolvedParams = await params;
  const condominiumId = resolvedParams.id;
  const [suppliers, expenseItems] = await Promise.all([
    getSuppliersBasic(condominiumId),
    getExpenseItemsGasto(condominiumId),
  ]);

  const supabase = await createClient();
  const { data: folio } = await supabase
    .from("folio_counters")
    .select("current_folio_op")
    .eq("condominium_id", condominiumId)
    .maybeSingle();
  const nextFolio = folio?.current_folio_op ? (Number(folio.current_folio_op) + 1).toString().padStart(4, "0") : undefined;

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.name || "Proveedor",
    expenseItemId: s.default_expense_item_id || undefined,
  }));
  const expenseOptions = expenseItems.map((r) => ({ value: r.id, label: r.name || "Rubro" }));

  return (
    <div className="space-y-6">
      <RegisterPayableForm condominiumId={condominiumId} suppliers={supplierOptions} expenseItems={expenseOptions} nextFolio={nextFolio} />
    </div>
  );
}

import { getExpenseItemsGasto, getPayableDetail, getSuppliersBasic } from "../../actions";
import RegisterPayableForm from "../../components/RegisterPayableForm";

type PageProps = { params: { id: string; payableId: string } | Promise<{ id: string; payableId: string }> };

export default async function EditPayablePage({ params }: PageProps) {
  const resolved = await params;
  const condominiumId = resolved.id;
  const payableId = resolved.payableId;

  const [payable, suppliers, expenseItems] = await Promise.all([
    getPayableDetail(condominiumId, payableId),
    getSuppliersBasic(condominiumId),
    getExpenseItemsGasto(condominiumId),
  ]);

  if (!payable) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 bg-white">
        No se encontró la OP.
      </div>
    );
  }

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.name || "Proveedor",
    expenseItemId: s.default_expense_item_id || undefined,
  }));
  const expenseOptions = expenseItems.map((r) => ({ value: r.id, label: r.name || "Rubro" }));

  const defaults = {
    supplier_id: payable.supplier_id,
    expense_item_id: payable.expense_item_id,
    document_type: payable.document_type || "factura",
    issue_date: payable.issue_date,
    due_date: payable.due_date,
    invoice_number: payable.invoice_number,
    total_amount: payable.total_amount,
    description: payable.description || "",
    planned_payment_method:
      (payable.notes || "")
        .split("|")
        .map((s: string) => s.trim())
        .find((s: string) => s.toLowerCase().startsWith("pago previsto"))
        ?.replace(/pago previsto:\s*/i, "") || "",
    planned_reference:
      (payable.notes || "")
        .split("|")
        .map((s: string) => s.trim())
        .find((s: string) => s.toLowerCase().startsWith("ref:"))
        ?.replace(/ref:\s*/i, "") || "",
  };

  return (
    <div className="space-y-6">
      <RegisterPayableForm
        condominiumId={condominiumId}
        suppliers={supplierOptions}
        expenseItems={expenseOptions}
        payableId={payableId}
        defaults={defaults}
      />
    </div>
  );
}

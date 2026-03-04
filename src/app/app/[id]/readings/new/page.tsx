import { getRubrosGasto } from "../actions";
import NewBillForm from "../components/NewBillForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewReadingPage({ params }: PageProps) {
  const { id: condominiumId } = await params;
  const rubros = await getRubrosGasto(condominiumId);

  return (
    <div className="space-y-6">
      <NewBillForm condominiumId={condominiumId} rubros={rubros} />
    </div>
  );
}

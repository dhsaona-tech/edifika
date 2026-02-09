import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CreditsPageClient from "./components/CreditsPageClient";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ unitId?: string }>;
};

export default async function CreditsPage({ params, searchParams }: Props) {
  const { id: condominiumId } = await params;
  const { unitId: filterUnitId } = await searchParams;
  const supabase = await createClient();

  // Verificar autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Cargar unidades para el filtro
  const { data: unitsData } = await supabase
    .from("units")
    .select("id, identifier, full_identifier")
    .eq("condominium_id", condominiumId)
    .eq("status", "activa")
    .order("identifier");

  const units = (unitsData || []).map((u) => ({
    value: u.id,
    label: u.full_identifier || u.identifier,
  }));

  return (
    <Suspense fallback={<div className="p-6">Cargando...</div>}>
      <CreditsPageClient
        condominiumId={condominiumId}
        units={units}
        initialUnitId={filterUnitId}
      />
    </Suspense>
  );
}

import { getResidentProfile } from "../actions";
import { notFound } from "next/navigation";
import ProfileHeader from "../components/ProfileHeader";
import ContactInfoCard from "../components/ContactInfoCard";
import AssociatedUnits from "../components/AssociatedUnits";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    id: string;
    residentId: string;
  }>;
}

export default async function ResidentProfilePage({ params }: PageProps) {
  const { id: condominiumId, residentId } = await params;
  const data = await getResidentProfile(condominiumId, residentId);

  if (!data || !data.profile) {
    notFound();
  }

  const { profile, history } = data;

  // Calcular roles activos para el header
  const roles = new Set<string>();
  history.forEach((h) => {
    if (!h.end_date) {
      if (h.relationship_type === 'OWNER') roles.add('Propietario');
      if (h.relationship_type === 'TENANT') roles.add('Inquilino');
    }
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/app/${condominiumId}/residents`} className="hover:text-brand transition-colors">
          ← Volver al Directorio
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-700">Perfil de {profile.first_name}</span>
      </div>

      {/* Header Resumido */}
      <ProfileHeader profile={profile} roles={Array.from(roles)} />

      {/* --- GRID PRINCIPAL --- */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* COLUMNA IZQUIERDA (GRANDE): FICHA TÉCNICA (75%) */}
        <div className="xl:col-span-9 order-2 xl:order-1">
          <ContactInfoCard profile={profile} condominiumId={condominiumId} />
        </div>

        {/* COLUMNA DERECHA (PEQUEÑA): UNIDADES (25%) */}
        <div className="xl:col-span-3 order-1 xl:order-2 sticky top-6">
          <AssociatedUnits history={history} />
          
          {/* Espacio para futuros widgets laterales (Saldo, Accesos, etc) */}
          <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700 text-center">
             <span className="font-bold block mb-1">Estado de Cuenta</span>
             Próximamente aquí
          </div>
        </div>

      </div>
    </div>
  );
}
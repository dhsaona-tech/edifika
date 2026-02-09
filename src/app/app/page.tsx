import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AppPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verificar si es superadmin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  let memberships: any[] = []

  if (profile?.is_superadmin) {
    // Superadmin ve todos los conjuntos
    const { data: condos } = await supabase
      .from('condominiums')
      .select('*')
    memberships = (condos || []).map(c => ({
      condominium_id: c.id,
      role: 'SUPER_ADMIN',
      condominium: c,
    }))
  } else {
    // Usuario normal: solo sus memberships activas
    const { data: userMemberships } = await supabase
      .from('memberships')
      .select('*, condominium:condominiums(*)')
      .eq('profile_id', user.id)
      .eq('status', 'activo')
    memberships = userMemberships || []
  }

  // Si solo tiene 1 conjunto, redirect directo
  if (memberships.length === 1) {
    redirect(`/app/${memberships[0].condominium_id}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Selecciona un conjunto
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Tienes acceso a {memberships?.length || 0} conjuntos
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="grid grid-cols-1 gap-4">
            {memberships?.map((membership: any) => (
              <Link
                key={membership.condominium_id}
                href={`/app/${membership.condominium_id}/dashboard`}
                className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-md transition-all"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {membership.condominium?.name}
                  </h3>
                  <p className="text-sm text-gray-500 capitalize">
                    Rol: {membership.role}
                  </p>
                </div>
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))}
          </div>

          {(!memberships || memberships.length === 0) && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No tienes acceso a ningún conjunto
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Contacta al administrador para obtener acceso
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
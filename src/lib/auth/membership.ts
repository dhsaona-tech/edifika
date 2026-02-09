import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'DIRECTIVA' | 'GUARDIA' | 'RESIDENTE'

export interface UserMembership {
  id: string
  condominiumId: string
  role: UserRole
  status: string
}

/**
 * Obtiene la membership del usuario actual en un condominio específico.
 * Redirige a /app si no tiene acceso.
 */
export async function getUserMembership(condominiumId: string): Promise<UserMembership> {
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

  if (profile?.is_superadmin) {
    return {
      id: user.id,
      condominiumId,
      role: 'SUPER_ADMIN',
      status: 'activo',
    }
  }

  // Buscar membership activa
  const { data: membership, error } = await supabase
    .from('memberships')
    .select('id, condominium_id, role, status')
    .eq('profile_id', user.id)
    .eq('condominium_id', condominiumId)
    .eq('status', 'activo')
    .single()

  if (error || !membership) {
    redirect('/app')
  }

  return {
    id: membership.id,
    condominiumId: membership.condominium_id,
    role: membership.role as UserRole,
    status: membership.status,
  }
}

/**
 * Obtiene la membership sin redirigir. Retorna null si no tiene acceso.
 */
export async function getUserMembershipOrNull(condominiumId: string): Promise<UserMembership | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (profile?.is_superadmin) {
    return {
      id: user.id,
      condominiumId,
      role: 'SUPER_ADMIN',
      status: 'activo',
    }
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('id, condominium_id, role, status')
    .eq('profile_id', user.id)
    .eq('condominium_id', condominiumId)
    .eq('status', 'activo')
    .single()

  if (!membership) return null

  return {
    id: membership.id,
    condominiumId: membership.condominium_id,
    role: membership.role as UserRole,
    status: membership.status,
  }
}

/**
 * Verifica que el usuario tenga uno de los roles permitidos.
 * Redirige a /app si no tiene el rol.
 */
export async function requireRole(condominiumId: string, allowedRoles: UserRole[]): Promise<UserMembership> {
  const membership = await getUserMembership(condominiumId)

  if (!allowedRoles.includes(membership.role)) {
    redirect('/app')
  }

  return membership
}

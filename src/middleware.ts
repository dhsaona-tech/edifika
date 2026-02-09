import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rutas públicas que no requieren autenticación
  const publicPaths = ['/login', '/signup', '/auth/callback']
  const isPublicPath = publicPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Si no está autenticado y no es ruta pública, redirect a login
  if (!user && !isPublicPath && request.nextUrl.pathname.startsWith('/app')) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Si está autenticado y va a login, redirect a /app
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  // Validar acceso a rutas de condominio: /app/[uuid]/...
  if (user && request.nextUrl.pathname.startsWith('/app/')) {
    const segments = request.nextUrl.pathname.split('/')
    // /app/[id]/... -> segments = ['', 'app', 'uuid', ...]
    const condominiumId = segments[2]

    // Solo validar si parece un UUID (evitar validar /app sin id)
    if (condominiumId && condominiumId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Verificar si es superadmin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_superadmin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_superadmin) {
        // Verificar membership activa
        const { data: membership } = await supabase
          .from('memberships')
          .select('id')
          .eq('profile_id', user.id)
          .eq('condominium_id', condominiumId)
          .eq('status', 'activo')
          .single()

        if (!membership) {
          return NextResponse.redirect(new URL('/app', request.url))
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

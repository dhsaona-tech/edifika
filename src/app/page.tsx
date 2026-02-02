import { redirect } from 'next/navigation'

export default function Home() {
  // Redirigir a /app (que luego redirige a login si no está autenticado)
  redirect('/app')
}
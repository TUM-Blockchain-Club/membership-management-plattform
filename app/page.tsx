import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { isLocalDevBypassEnabled } from '@/lib/devBypass'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function Home() {
  const headerStore = await headers()
  const host = headerStore.get('host') || 'localhost'
  const hostname = host.split(':')[0] || 'localhost'

  if (isLocalDevBypassEnabled(hostname)) {
    redirect('/home')
  }

  let isAuthenticated = false

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    isAuthenticated = Boolean(user)
  } catch {
    redirect('/signin')
  }

  redirect(isAuthenticated ? '/home' : '/signin')
}

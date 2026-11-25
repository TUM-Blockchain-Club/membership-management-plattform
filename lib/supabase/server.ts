import { createServerClient } from '@supabase/ssr'
import { cache } from 'react'
import { cookies } from 'next/headers'

export const createSupabaseServerClient = cache(async () => {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Ignore in server component contexts where setting cookies is not allowed.
        }
      },
    },
  })
})

export const getSupabaseUser = cache(async () => {
  const supabase = await createSupabaseServerClient()
  return supabase.auth.getUser()
})

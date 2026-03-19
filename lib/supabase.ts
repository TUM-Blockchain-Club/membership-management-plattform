import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let browserClient: ReturnType<typeof createBrowserClient> | null = null

const createUnavailableClient = () => {
  return new Proxy(
    {},
    {
      get() {
        throw new Error('Supabase client is unavailable: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
      },
    }
  ) as ReturnType<typeof createBrowserClient>
}

const createSupabaseBrowserClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    return createUnavailableClient()
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}

export const getSupabaseBrowserClient = () => {
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient()
  }

  return browserClient
}

export const supabase =
  typeof window === 'undefined' ? createUnavailableClient() : getSupabaseBrowserClient()

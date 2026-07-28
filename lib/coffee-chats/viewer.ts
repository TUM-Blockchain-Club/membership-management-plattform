import 'server-only'

import { headers } from 'next/headers'
import {
  getLocalDevBypassMemberId,
  isLocalDevBypassEnabled,
} from '@/lib/devBypass'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type CoffeeChatViewer = {
  email: string | null
  isDevBypass: boolean
  memberId: number | null
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
}

export async function getCoffeeChatViewer(): Promise<CoffeeChatViewer | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return {
      email: user.email ?? null,
      isDevBypass: false,
      memberId: null,
      supabase,
    }
  }

  const headerStore = await headers()
  const hostname = (headerStore.get('host') ?? '').split(':')[0]
  if (!isLocalDevBypassEnabled(hostname)) return null

  return {
    email: null,
    isDevBypass: true,
    memberId: getLocalDevBypassMemberId(),
    supabase,
  }
}

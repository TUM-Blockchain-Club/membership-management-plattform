import type { SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import type { Database } from '@/lib/types/database.types'

export function getCoffeeChatAdminClient(): SupabaseClient<Database> | null {
  return getSupabaseAdminClient() as SupabaseClient<Database> | null
}

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { GrantAdministration } from '@/app/dashboard/tabs/events/GrantAdministration'
export default async function Page() {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect('/signin')
  const { data, error } = await client.rpc('can_manage_event_grants')
  if (error) throw new Error('Could not verify grant access.')
  if (!data) redirect('/home')
  return <GrantAdministration />
}

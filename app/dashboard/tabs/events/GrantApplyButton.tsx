'use client'
import { use } from 'react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { ExternalLinkIcon, TicketIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { safeGrantUrl } from '@/lib/eventGrants'
export function GrantApplyButton({ eventId, grantUrl, closed }: { eventId: number; grantUrl: string | null; closed: boolean }) {
  const dashboard = use(DashboardContext)
  const [saving, setSaving] = useState(false)
  const { data, error, mutate } = useSWR<Array<{ event_id: number }>>(dashboard?.member ? `/api/event-grants?viewer=${dashboard.member.id}` : null, async (url: string) => {
    const response = await fetch(url); const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Could not load applications.')
    return body
  })
  let href: string | null = null
  try { href = safeGrantUrl(grantUrl) } catch { /* Invalid historic links cannot become executable links. */ }
  const applied = data?.some(row => row.event_id === eventId) ?? false
  if (closed && !applied) return <Button size="sm" className="w-40" disabled>Applications closed</Button>
  if (href) return <Button asChild size="sm" className="w-40" disabled={closed}><a href={href} target="_blank" rel="noopener noreferrer"><ExternalLinkIcon data-icon="inline-start" />Apply for grant</a></Button>
  return <Button size="sm" className="w-40" variant={applied ? 'secondary' : 'default'} disabled={saving || (!applied && closed) || (!data && !error)} onClick={async () => {
    if (error) { void mutate(); return }
    setSaving(true)
    try {
      const response = await fetch('/api/event-grants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, apply: !applied }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Could not update application.')
      await mutate(current => body.applied ? [...(current ?? []).filter(row => row.event_id !== eventId), { event_id: eventId }] : (current ?? []).filter(row => row.event_id !== eventId), { revalidate: false })
      toast.success(body.applied ? 'Grant application submitted' : 'Grant application withdrawn')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not apply.') }
    finally { setSaving(false) }
  }}><TicketIcon data-icon="inline-start" />{saving ? 'Saving…' : error ? 'Retry grant status' : applied ? 'Withdraw grant' : closed ? 'Applications closed' : 'Apply for grant'}</Button>
}

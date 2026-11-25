'use client'
import useSWR from 'swr'
import { use } from 'react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
type Application = { event_id: number; member_id: number; created_at: string; events: { title: string } | null; members_main: { Name: string | null; Department: string | null } | null }
export function GrantAdministration() {
  const dashboard = use(DashboardContext)!
  const { data, error, isLoading, mutate } = useSWR<Application[]>(dashboard.forceMemberView || !dashboard.showGrantAdminTab ? null : `/api/event-grants?admin=true&viewer=${dashboard.member?.id}`, async (url: string) => {
    const response = await fetch(url); const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Could not load applications.')
    return body
  })
  if (dashboard.forceMemberView || !dashboard.showGrantAdminTab) return null
  return <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
    <header><h1 className="text-2xl font-semibold">Event grants</h1><p className="mt-2 text-sm text-muted-foreground">Review member applications submitted through the platform. External forms are managed at their destination.</p></header>
    {error ? <Alert variant="destructive"><AlertDescription>{error.message}<Button variant="outline" onClick={() => void mutate()}>Try again</Button></AlertDescription></Alert> : isLoading ? <Spinner /> :
    <Card><CardHeader><CardTitle>Applications</CardTitle><CardDescription>{data?.length ?? 0} applications · visible only to grant administrators</CardDescription></CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">{!data?.length ? <p className="py-6 text-sm text-muted-foreground">No grant applications yet.</p> : data.map(row => <div key={`${row.event_id}-${row.member_id}`} className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div><p className="font-medium">{row.events?.title || 'Event'}</p><p className="text-sm text-muted-foreground">{row.members_main?.Name || 'Member'}{row.members_main?.Department ? ` · ${row.members_main.Department}` : ''}</p></div>
        <time className="text-sm text-muted-foreground" dateTime={row.created_at}>{new Date(row.created_at).toLocaleDateString('en-GB')}</time>
      </div>)}</CardContent></Card>}
  </main>
}

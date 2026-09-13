'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import { ShieldCheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { ADMIN_SCOPES, type AdminAccessData, type AdminScope } from '@/lib/adminAccess'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

async function loadAccess(): Promise<AdminAccessData> {
  const response = await fetch('/api/admin-access', { cache: 'no-store' })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'Could not load admin access.')
  return payload
}
export function AdminAccessPage() {
  const dashboard = use(DashboardContext)
  const allowed = dashboard?.showAdminAccessTab === true
  const { data, error, isLoading, mutate } = useSWR(allowed ? 'admin-access' : null, loadAccess)
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [changeError, setChangeError] = useState('')
  if (!allowed) return null
  const names = new Map(data?.members.map(member => [member.id, member.Name || `Member #${member.id}`]))
  const assignments = new Set(data?.assignments.map(row => `${row.member_id}:${row.scope}`))
  const visibleMembers = data?.members.filter(member => !search.trim() || [member.Name || `Member #${member.id}`, member.Department].some(value => value?.toLowerCase().includes(search.toLowerCase().trim()))) ?? []
  async function change(memberId: number, scope: AdminScope, enabled: boolean) {
    if (pending) return
    setPending(`${memberId}:${scope}`)
    setChangeError('')
    try {
      const response = await fetch('/api/admin-access', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId, scope, enabled }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not change access.')
      await mutate()
      toast.success(`${ADMIN_SCOPES.find(item => item.key === scope)?.label} access ${enabled ? 'granted' : 'removed'}.`)
    } catch (error) { setChangeError(error instanceof Error ? error.message : 'Could not change access.') }
    finally { setPending(null) }
  }
  return <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
    <header className="flex flex-col gap-2">
      <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl"><ShieldCheckIcon className="size-7 text-primary" />Admin Access</h2>
      <p className="text-sm text-muted-foreground">Manage access to the platform’s administration areas. Only board members can change permissions.</p>
    </header>
    <Card>
      <CardHeader><CardTitle>Member permissions</CardTitle><CardDescription>Board members have automatic access to every area. Other administrators can operate their assigned area, but cannot grant permissions.</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field><FieldLabel htmlFor="admin-access-search">Find a member</FieldLabel><Input id="admin-access-search" type="search" placeholder="Search name or department…" value={search} onChange={event => setSearch(event.target.value)} /></Field>
        {(error || changeError) && <Alert variant="destructive"><AlertDescription>{changeError || error.message}<Button variant="link" size="sm" onClick={() => void mutate()}>Retry</Button></AlertDescription></Alert>}
        {isLoading ? <div className="flex flex-col gap-3" aria-label="Loading member permissions">{[0,1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div> : data && <div className="max-h-[32rem] overflow-auto"><Table>
          <TableHeader><TableRow className="border-border"><TableHead>Member</TableHead>{ADMIN_SCOPES.map(scope => <TableHead key={scope.key} className="text-center">{scope.label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{visibleMembers.map(member => {
            const board = member.Role?.trim() === 'Board Member'
            return <TableRow key={member.id} className="border-border">
              <TableCell><div className="flex flex-col gap-1"><span className="font-medium">{names.get(member.id)}</span><span className="text-xs text-muted-foreground">{member.Department || 'No department'}</span><div>{board ? <Badge variant="secondary">Board · automatic</Badge> : member.Status !== 'Active' && <Badge variant="outline">{member.Status || 'Inactive'}</Badge>}</div></div></TableCell>
              {ADMIN_SCOPES.map(scope => {
                const key = `${member.id}:${scope.key}`
                const enabled = board || assignments.has(key)
                return <TableCell key={scope.key} className="text-center"><Switch aria-label={`${scope.label} access for ${names.get(member.id)}`} checked={enabled} disabled={board || pending !== null || (!enabled && member.Status !== 'Active')} onCheckedChange={value => void change(member.id, scope.key, value)} /></TableCell>
              })}
            </TableRow>
          })}{!visibleMembers.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No matching members.</TableCell></TableRow>}</TableBody>
        </Table></div>}
        <p role="status" className="text-xs text-muted-foreground">{pending ? 'Saving access…' : 'Changes are saved immediately and recorded below. New access can only be granted to active members.'}</p>
      </CardContent>
    </Card>
    <Card><CardHeader><CardTitle>Recent changes</CardTitle><CardDescription>The latest 50 permission changes. Imported assignments are marked as migrated.</CardDescription></CardHeader><CardContent>
      {data && !data.audit.length && <p className="text-sm text-muted-foreground">No changes recorded yet.</p>}
      <ul className="flex flex-col divide-y divide-border">{data?.audit.map(entry => <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
        <span><span className="font-medium">{names.get(entry.member_id) || `Member #${entry.member_id}`}</span> · {ADMIN_SCOPES.find(scope => scope.key === entry.scope)?.label} · {entry.action}<span className="block text-xs text-muted-foreground">{entry.action === 'migrated' ? 'Imported from existing permissions' : `By ${names.get(entry.actor_member_id ?? -1) || 'Former board member'}`}</span></span>
        <time dateTime={entry.created_at} className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</time>
      </li>)}</ul>
    </CardContent></Card>
  </section>
}

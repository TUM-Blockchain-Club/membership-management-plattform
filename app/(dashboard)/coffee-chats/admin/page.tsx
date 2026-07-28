'use client'

import { useContext, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlusIcon, PlayIcon, UsersIcon } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { DateTimePicker, MonthPicker } from '@/components/date-picker'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { localDateTimeToUtcIso } from '@/lib/coffee-chats/rounds'
import { DashboardContext } from '@/app/dashboard/DashboardContext'

interface Round {
  id: string
  month: string
  status: string
  signup_deadline: string | null
  meet_deadline: string | null
  created_at: string
}

export default function CoffeeChatsAdminPage() {
  const router = useRouter()
  const dashboard = useContext(DashboardContext)
  const supabase = getSupabaseBrowserClient()
  const canManageCoffeeChats = dashboard?.canManageCoffeeChats ?? false
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [rounds, setRounds] = useState<Round[]>([])
  const [signupCounts, setSignupCounts] = useState<Record<string, number>>({})
  const [pairCounts, setPairCounts] = useState<Record<string, number>>({})

  // New round form
  const [newMonth, setNewMonth] = useState('')
  const [newSignupDeadline, setNewSignupDeadline] = useState('')
  const [newMeetDeadline, setNewMeetDeadline] = useState('')

  useEffect(() => {
    if (!canManageCoffeeChats) {
      router.replace('/coffee-chats')
      return
    }

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: adminResult } = await supabase.rpc('check_email_can_manage_coffee_chats', {
        check_email: user?.email ?? '',
      })
      setIsAdmin(adminResult === true)

      if (adminResult !== true) { setLoading(false); return }

      const { data: roundsData } = await supabase
        .from('cc_rounds')
        .select('id, month, status, signup_deadline, meet_deadline, created_at')
        .order('created_at', { ascending: false })

      const allRounds = (roundsData ?? []) as Round[]
      setRounds(allRounds)

      // Load counts per round
      const counts: Record<string, number> = {}
      const pCounts: Record<string, number> = {}

      await Promise.all(
        allRounds.map(async (r) => {
          const [{ count: sc }, { count: pc }] = await Promise.all([
            supabase.from('cc_signups').select('id', { count: 'exact', head: true }).eq('round_id', r.id),
            supabase.from('cc_pairs').select('id', { count: 'exact', head: true }).eq('round_id', r.id),
          ])
          counts[r.id] = sc ?? 0
          pCounts[r.id] = pc ?? 0
        })
      )

      setSignupCounts(counts)
      setPairCounts(pCounts)
      setLoading(false)
    }
    void load()
  }, [canManageCoffeeChats, router, supabase])

  function handleCreateRound() {
    if (!newMonth) { toast.error('Month is required'); return }
    if (
      newSignupDeadline &&
      newMeetDeadline &&
      new Date(newSignupDeadline).getTime() > new Date(newMeetDeadline).getTime()
    ) {
      toast.error('The signup deadline must be before the meeting deadline.')
      return
    }

    startTransition(async () => {
      const { data, error } = await supabase.from('cc_rounds').insert({
        month: newMonth,
        signup_deadline: newSignupDeadline ? localDateTimeToUtcIso(newSignupDeadline) : null,
        meet_deadline: newMeetDeadline ? localDateTimeToUtcIso(newMeetDeadline) : null,
        status: 'open',
      }).select().single()

      if (error) {
        toast.error('The round could not be created. Check the dates and try again.')
        return
      }

      toast.success(`Round ${newMonth} created.`)
      setRounds((prev) => [data as Round, ...prev])
      setSignupCounts((prev) => ({ ...prev, [(data as Round).id]: 0 }))
      setPairCounts((prev) => ({ ...prev, [(data as Round).id]: 0 }))
      setNewMonth('')
      setNewSignupDeadline('')
      setNewMeetDeadline('')
    })
  }

  function handleRunPairing(roundId: string) {
    startTransition(async () => {
      const res = await fetch('/api/coffee-chats/run-pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId }),
      })
      const json = await res.json() as {
        ok?: boolean
        pairsCreated?: number
        memberCount?: number
        emailsSent?: number
        emailsFailed?: number
        error?: string
      }

      if (!res.ok || !json.ok) {
        toast.error('Pairing could not be completed. No partial pairing was saved; try again or check the server logs.')
        return
      }

      const emailSummary = json.emailsFailed
        ? `${json.emailsSent ?? 0} emails sent; ${json.emailsFailed} failed.`
        : `${json.emailsSent ?? 0} emails sent.`
      const message = `Paired ${json.memberCount} members into ${json.pairsCreated} groups. ${emailSummary}`
      if (json.emailsFailed) toast.warning(message)
      else toast.success(message)
      setRounds((prev) => prev.map((r) => r.id === roundId ? { ...r, status: 'paired' } : r))
    })
  }

  function statusVariant(status: string): 'default' | 'secondary' | 'outline' {
    if (status === 'open') return 'secondary'
    if (status === 'paired') return 'default'
    return 'outline'
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!canManageCoffeeChats || !isAdmin) {
    return (
      <Empty className="mx-auto max-w-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
          <EmptyTitle>Admin access required</EmptyTitle>
          <EmptyDescription>This page is available to board and special-access members.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">Coffee Chats admin</h3>
        <p className="text-sm text-muted-foreground">Manage rounds and run pairings.</p>
      </div>

      {/* Create round */}
      <Card className="border-border bg-background/50">
        <CardHeader>
          <CardTitle>Create new round</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="coffee-chat-month">Month</FieldLabel>
              <MonthPicker
                id="coffee-chat-month"
                value={newMonth}
                onChange={setNewMonth}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="coffee-chat-signup-deadline">Sign-up deadline</FieldLabel>
              <DateTimePicker
                id="coffee-chat-signup-deadline"
                value={newSignupDeadline}
                onChange={setNewSignupDeadline}
                placeholder="Pick deadline"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="coffee-chat-meet-deadline">Meet deadline</FieldLabel>
              <DateTimePicker
                id="coffee-chat-meet-deadline"
                value={newMeetDeadline}
                onChange={setNewMeetDeadline}
                placeholder="Pick deadline"
              />
            </Field>
          </FieldGroup>
          <Button onClick={handleCreateRound} disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
            {isPending ? 'Creating…' : 'Create round'}
          </Button>
        </CardContent>
      </Card>

      {/* Rounds table */}
      <Card className="border-border bg-background/50">
        <CardHeader>
          <CardTitle>All rounds</CardTitle>
        </CardHeader>
        <CardContent>
          {rounds.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
                <EmptyTitle>No rounds yet</EmptyTitle>
                <EmptyDescription>Create the first round above.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Month</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">
                    <UsersIcon className="inline size-4" /> Signups
                  </TableHead>
                  <TableHead className="text-center">Pairs</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rounds.map((round) => (
                  <TableRow key={round.id} className="border-border">
                    <TableCell className="font-medium">{round.month}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(round.status)}>{round.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {signupCounts[round.id] ?? 0}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {pairCounts[round.id] ?? 0}
                    </TableCell>
                    <TableCell>
                      {round.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRunPairing(round.id)}
                          disabled={isPending}
                        >
                          <PlayIcon data-icon="inline-start" />
                          Run Pairing
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

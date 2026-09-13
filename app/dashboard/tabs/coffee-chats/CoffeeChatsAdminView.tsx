'use client'

import { useContext, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlusIcon, ChevronRightIcon, Trash2Icon, UsersIcon } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { DatePicker, MonthPicker } from '@/components/date-picker'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { demoRounds, isCoffeeChatsDemoClient, localDateToUtcIso } from '@/lib/coffee-chats'

import { CoffeeChatRoundDialog, type CoffeeChatAdminRound as Round } from './CoffeeChatRoundDialog'

export function CoffeeChatsAdminView() {
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

  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
  const selectedRound = rounds.find(round => round.id === selectedRoundId)

  // Delete round dialog
  const [roundToDelete, setRoundToDelete] = useState<Round | null>(null)

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
      if (isCoffeeChatsDemoClient()) {
        setIsAdmin(true)
        setRounds(demoRounds)
        setSignupCounts({ 'demo-round-august-2026': 12, 'demo-round-july-2026': 18 })
        setPairCounts({ 'demo-round-august-2026': 0, 'demo-round-july-2026': 9 })
        setLoading(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      const userEmail = user?.email ?? ''

      const { data: adminResult } = await supabase.rpc('check_email_can_manage_coffee_chats', {
        check_email: userEmail,
      })
      const isAllowed = adminResult === true
      setIsAdmin(isAllowed)

      if (!isAllowed) {
        setLoading(false)
        return
      }

      const { data: roundsData } = await supabase.from('cc_rounds')
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
        }),
      )

      setSignupCounts(counts)
      setPairCounts(pCounts)

      setLoading(false)
    }
    void load()
  }, [canManageCoffeeChats, router, supabase])

  function handleCreateRound() {
    if (!newMonth) {
      toast.error('Month is required')
      return
    }
    if (newSignupDeadline && newMeetDeadline && newSignupDeadline > newMeetDeadline) {
      toast.error('The signup deadline must be before the meeting deadline.')
      return
    }

    startTransition(async () => {
      if (isCoffeeChatsDemoClient()) {
        const round: Round = {
          id: crypto.randomUUID(),
          month: newMonth,
          status: 'open',
          signup_deadline: newSignupDeadline || null,
          meet_deadline: newMeetDeadline || null,
          created_at: new Date().toISOString(),
        }
        setRounds((current) => [round, ...current])
        toast.success(`Demo round ${newMonth} created.`)
        setNewMonth('')
        setNewSignupDeadline('')
        setNewMeetDeadline('')
        return
      }

      const { data, error } = await supabase
        .from('cc_rounds')
        .insert({
          month: newMonth,
          signup_deadline: newSignupDeadline ? localDateToUtcIso(newSignupDeadline) : null,
          meet_deadline: newMeetDeadline ? localDateToUtcIso(newMeetDeadline) : null,
          status: 'open',
        })
        .select()
        .single()

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
      try {
        if (isCoffeeChatsDemoClient()) {
          setRounds((current) =>
            current.map((round) => (round.id === roundId ? { ...round, status: 'paired' } : round)),
          )
          setPairCounts((current) => ({ ...current, [roundId]: 6 }))
          toast.success('Demo pairing completed: 12 members in 6 pairs.')
          return
        }

        const res = await fetch('/api/coffee-chats/run-pairing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roundId }),
        })
        const json = (await res.json()) as {
          ok?: boolean
          pairsCreated?: number
          memberCount?: number
          emailsSent?: number
          emailsFailed?: number
          error?: string
        }

        if (!res.ok || !json.ok) {
          toast.error('Pairing could not be completed. Try again or check server logs.')
          return
        }

        const emailSummary = json.emailsFailed
          ? `${json.emailsSent ?? 0} emails sent; ${json.emailsFailed} failed.`
          : `${json.emailsSent ?? 0} emails sent.`
        const message = `Paired ${json.memberCount} members into ${json.pairsCreated} groups. ${emailSummary}`
        if (json.emailsFailed) toast.warning(message)
        else toast.success(message)
        setPairCounts(current => ({ ...current, [roundId]: json.pairsCreated ?? current[roundId] ?? 0 }))
        setRounds((prev) => prev.map((r) => (r.id === roundId ? { ...r, status: 'paired' } : r)))
      } catch {
        toast.error('Pairing could not be completed. Please retry.')
      }
    })
  }

  function handleDeleteRound() {
    if (!roundToDelete) return

    const target = roundToDelete
    startTransition(async () => {
      try {
        if (isCoffeeChatsDemoClient()) {
          setRounds((current) => current.filter((r) => r.id !== target.id))
          setRoundToDelete(null)
          toast.success(`Demo round ${target.month} removed.`)
          return
        }

        const res = await fetch(`/api/coffee-chats/rounds/${target.id}`, { method: 'DELETE' })
        const json = (await res.json()) as { ok?: boolean; error?: string }

        if (!res.ok || !json.ok) {
          toast.error(json.error ?? 'Failed to delete round. Please try again.')
          return
        }

        setRounds((prev) => prev.filter((r) => r.id !== target.id))
        setRoundToDelete(null)
        toast.success(`Round ${target.month} and associated pairings removed.`)
      } catch {
        toast.error('The round could not be deleted. Please retry.')
      }
    })
  }

  function statusVariant(status: string): 'default' | 'secondary' | 'outline' {
    if (status === 'open') return 'secondary'
    if (status === 'paired') return 'default'
    return 'outline'
  }

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-8" aria-label="Loading Coffee Chats admin">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-9 w-32" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!canManageCoffeeChats || !isAdmin) {
    return (
      <Empty className="max-w-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>Admin access required</EmptyTitle>
          <EmptyDescription>
            This page is available to board members and assigned Coffee Chat administrators.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Create round */}
      <Card className="border-border bg-background/50">
        <CardHeader>
          <CardTitle>Create new round</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="coffee-chat-month">Month</FieldLabel>
              <MonthPicker id="coffee-chat-month" value={newMonth} onChange={setNewMonth} />
            </Field>
            <Field>
              <FieldLabel htmlFor="coffee-chat-signup-deadline">Sign-up deadline</FieldLabel>
              <DatePicker
                id="coffee-chat-signup-deadline"
                value={newSignupDeadline}
                onChange={setNewSignupDeadline}
                placeholder="Pick deadline"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="coffee-chat-meet-deadline">Meet deadline</FieldLabel>
              <DatePicker
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
          <CardDescription>Select a round to view signups, edit deadlines and manage pairing.</CardDescription>
        </CardHeader>
        <CardContent>
          {rounds.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersIcon />
                </EmptyMedia>
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
                  <TableHead className="text-right"><span className="sr-only">Details</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rounds.map((round) => (
                  <TableRow key={round.id} className="group cursor-pointer border-border hover:bg-muted/60" onClick={() => setSelectedRoundId(round.id)}>
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
                    <TableCell className="text-right">
                      <Button id={`coffee-round-${round.id}`} size="sm" variant="ghost" aria-label={`View round ${round.month}`} aria-haspopup="dialog" onClick={(event) => { event.stopPropagation(); setSelectedRoundId(round.id) }}>
                        View round<ChevronRightIcon data-icon="inline-end" className="transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedRound && <CoffeeChatRoundDialog key={selectedRound.id} round={selectedRound} busy={isPending}
        onClose={() => setSelectedRoundId(null)}
        onUpdated={(updated) => setRounds(current => current.map(round => round.id === updated.id ? updated : round))}
        onPair={() => handleRunPairing(selectedRound.id)}
        onDelete={() => setRoundToDelete(selectedRound)}
      />}

      {/* Delete Confirmation Dialog */}
      <Dialog open={roundToDelete !== null} onOpenChange={(open) => !open && setRoundToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {roundToDelete?.month} round?</DialogTitle>
            <DialogDescription>
              This will permanently delete the round, all member signups for this month, and all generated pairings. Any uploaded selfies will also be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteRound} disabled={isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : <Trash2Icon data-icon="inline-start" />}
              {isPending ? 'Deleting…' : 'Delete round'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

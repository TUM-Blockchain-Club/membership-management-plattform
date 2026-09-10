'use client'

import { useContext, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlusIcon, PlayIcon, ShieldIcon, Trash2Icon, UserMinusIcon, UserPlusIcon, UsersIcon } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { DatePicker, MonthPicker } from '@/components/date-picker'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { demoRounds, isCoffeeChatsDemoClient, localDateToUtcIso } from '@/lib/coffee-chats'

interface Round {
  id: string
  month: string
  status: string
  signup_deadline: string | null
  meet_deadline: string | null
  created_at: string
}

interface AssignedAdmin {
  memberId: number
  name: string
  department: string | null
  email: string | null
  createdAt: string
}

interface MemberOption {
  id: number
  name: string
  department: string | null
  role: string | null
}

type MemberRow = {
  id: number
  Name: string | null
  Department: string | null
  Role: string | null
}

export function CoffeeChatsAdminView() {
  const router = useRouter()
  const dashboard = useContext(DashboardContext)
  const supabase = getSupabaseBrowserClient()
  const canManageCoffeeChats = dashboard?.canManageCoffeeChats ?? false
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [canManageAdmins, setCanManageAdmins] = useState(false)

  const [rounds, setRounds] = useState<Round[]>([])
  const [signupCounts, setSignupCounts] = useState<Record<string, number>>({})
  const [pairCounts, setPairCounts] = useState<Record<string, number>>({})

  // Admin management
  const [admins, setAdmins] = useState<AssignedAdmin[]>([])
  const [allMembers, setAllMembers] = useState<MemberOption[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')

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
        setCanManageAdmins(true)
        setRounds(demoRounds)
        setSignupCounts({ 'demo-round-august-2026': 12, 'demo-round-july-2026': 18 })
        setPairCounts({ 'demo-round-august-2026': 0, 'demo-round-july-2026': 9 })
        setAdmins([
          {
            memberId: 3,
            name: 'Mina Bauer',
            department: 'Research',
            email: 'mina.bauer@tum-blockchain.com',
            createdAt: '2026-08-01T10:00:00.000Z',
          },
        ])
        setAllMembers([
          { id: 1, name: 'Yesi Demo', department: 'Web3 Talents', role: 'Board Member' },
          { id: 2, name: 'Alex Morgan', department: 'IT & Development', role: 'Core Member' },
          { id: 3, name: 'Mina Bauer', department: 'Research', role: 'Core Member' },
          { id: 4, name: 'Jonas Keller', department: 'Industry', role: 'Core Member' },
        ])
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

      // Check if user is board member or has special access
      const [{ data: specialAccess }, { data: currentMember }] = await Promise.all([
        supabase.rpc('check_email_has_special_access', { check_email: userEmail }),
        supabase.from('members_main').select('Role').ilike('"TBC Email"', userEmail).maybeSingle(),
      ])

      const isBoardOrSpecial = specialAccess === true || currentMember?.Role === 'Board Member'
      setCanManageAdmins(isBoardOrSpecial)

      // Load rounds & all members
      const [{ data: roundsData }, { data: membersData }] = await Promise.all([
        supabase
          .from('cc_rounds')
          .select('id, month, status, signup_deadline, meet_deadline, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('members_main').select('id, Name, Department, Role').order('Name', { ascending: true }),
      ])

      const allRounds = (roundsData ?? []) as Round[]
      setRounds(allRounds)

      if (membersData) {
        const typedMembers = membersData as unknown as MemberRow[]
        setAllMembers(
          typedMembers.map((m) => ({
            id: m.id,
            name: m.Name ?? 'Unnamed Member',
            department: m.Department,
            role: m.Role,
          })),
        )
      }

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

      // Load assigned admins from API
      try {
        const adminsRes = await fetch('/api/coffee-chats/admins')
        if (adminsRes.ok) {
          const adminsJson = (await adminsRes.json()) as { ok?: boolean; admins?: AssignedAdmin[] }
          if (adminsJson.ok && adminsJson.admins) {
            setAdmins(adminsJson.admins)
          }
        }
      } catch (err) {
        console.warn('[coffee-chats/admin] failed to fetch admins:', err)
      }

      setLoading(false)
    }
    void load()
  }, [canManageCoffeeChats, router, supabase])

  // Filter available members to assign (exclude members already in admin list)
  const assignableMembers = useMemo(() => {
    const assignedIds = new Set(admins.map((a) => a.memberId))
    return allMembers.filter((m) => !assignedIds.has(m.id))
  }, [allMembers, admins])

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
      setRounds((prev) => prev.map((r) => (r.id === roundId ? { ...r, status: 'paired' } : r)))
    })
  }

  function handleDeleteRound() {
    if (!roundToDelete) return

    const target = roundToDelete
    startTransition(async () => {
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
    })
  }

  function handleAssignAdmin() {
    if (!selectedMemberId) {
      toast.error('Please select a member to assign.')
      return
    }

    const memberIdNum = Number(selectedMemberId)
    const targetMember = allMembers.find((m) => m.id === memberIdNum)

    startTransition(async () => {
      if (isCoffeeChatsDemoClient()) {
        if (targetMember) {
          setAdmins((prev) => [
            {
              memberId: targetMember.id,
              name: targetMember.name,
              department: targetMember.department,
              email: null,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ])
        }
        setSelectedMemberId('')
        toast.success(`${targetMember?.name ?? 'Member'} assigned as Coffee Chat administrator.`)
        return
      }

      const res = await fetch('/api/coffee-chats/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: memberIdNum }),
      })

      const json = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Could not assign administrator.')
        return
      }

      if (targetMember) {
        setAdmins((prev) => [
          {
            memberId: targetMember.id,
            name: targetMember.name,
            department: targetMember.department,
            email: null,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ])
      }
      setSelectedMemberId('')
      toast.success(`${targetMember?.name ?? 'Member'} assigned as Coffee Chat administrator.`)
    })
  }

  function handleRemoveAdmin(memberId: number, memberName: string) {
    startTransition(async () => {
      if (isCoffeeChatsDemoClient()) {
        setAdmins((prev) => prev.filter((a) => a.memberId !== memberId))
        toast.success(`${memberName} removed from Coffee Chat administrators.`)
        return
      }

      const res = await fetch('/api/coffee-chats/admins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })

      const json = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Could not remove administrator.')
        return
      }

      setAdmins((prev) => prev.filter((a) => a.memberId !== memberId))
      toast.success(`${memberName} removed from Coffee Chat administrators.`)
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
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">Coffee Chats admin</h3>
        <p className="text-sm text-muted-foreground">Manage rounds, pairings, and administrators.</p>
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
          <CardDescription>View, run pairing, or remove monthly rounds.</CardDescription>
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
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setRoundToDelete(round)}
                          disabled={isPending}
                          title="Delete round"
                        >
                          <Trash2Icon className="size-4" />
                          <span className="sr-only">Delete round</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Admin Assignment Section (Visible to Board Members & Special Access) */}
      {canManageAdmins && (
        <Card className="border-border bg-background/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldIcon className="size-5 text-primary" />
              <CardTitle>Coffee Chat Administrators</CardTitle>
            </div>
            <CardDescription>
              Board members have administrator rights by default. You can assign additional members from the club to manage rounds and pairings here.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Selector to add an admin */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
              <Field className="flex-1 w-full">
                <FieldLabel htmlFor="admin-member-select">Select a member to assign as admin</FieldLabel>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger id="admin-member-select" className="w-full">
                    <SelectValue placeholder="Choose a member…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {assignableMembers.map((member) => (
                      <SelectItem key={member.id} value={String(member.id)}>
                        <span className="font-medium">{member.name}</span>
                        {member.department && (
                          <span className="text-muted-foreground ml-2 text-xs">({member.department})</span>
                        )}
                        {member.role === 'Board Member' && (
                          <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1">Board</Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>Choose from active club members.</FieldDescription>
              </Field>

              <Button
                onClick={handleAssignAdmin}
                disabled={isPending || !selectedMemberId}
                className="w-full sm:w-fit shrink-0"
              >
                {isPending ? <Spinner data-icon="inline-start" /> : <UserPlusIcon data-icon="inline-start" />}
                Assign Admin
              </Button>
            </div>

            {/* List of currently assigned admins */}
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-medium text-foreground">Assigned Administrators ({admins.length})</h4>
              {admins.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No additional administrators assigned yet. All board members automatically have administrator access.
                </p>
              ) : (
                <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                  {admins.map((admin) => (
                    <div key={admin.memberId} className="flex items-center justify-between p-3 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{admin.name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {admin.department && <span>{admin.department}</span>}
                          {admin.email && <span>&bull; {admin.email}</span>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleRemoveAdmin(admin.memberId, admin.name)}
                        disabled={isPending}
                        title="Remove admin"
                      >
                        <UserMinusIcon className="size-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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

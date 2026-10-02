'use client'

import { useCallback, useContext, useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircle2Icon,
  HelpCircleIcon,
  PlayIcon,
  RefreshCwIcon,
  SparklesIcon,
  Trash2Icon,
  UserCheckIcon,
  UserMinusIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
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
import {
  formatCoffeeChatDate,
  formatCoffeeChatMonth,
  isCoffeeChatsDemoClient,
  runPairing,
} from '@/lib/coffee-chats'

interface MemberInfo {
  id: number
  name: string
  department: string | null
  email: string | null
  interests?: string[]
  active?: boolean
  role?: string | null
}

interface SignupItem {
  id: string
  memberId: number
  signedUpAt: string
  name: string
  department: string | null
  email: string | null
  interests: string[]
}

interface PairItem {
  id: string
  roundId: string
  status: string
  createdAt: string
  person1: MemberInfo
  person2: MemberInfo
  person3: MemberInfo | null
  icebreakers: string[]
}

interface RoundDetails {
  id: string
  month: string
  status: string
  signupDeadline: string | null
  meetDeadline: string | null
  createdAt: string
  pairingDate: string | null
}

interface DraftPair {
  id: string
  person1Id: number
  person2Id: number
  person3Id?: number | null
}

export function CoffeeChatRoundDetailView({ roundId }: { roundId: string }) {
  const router = useRouter()
  const dashboard = useContext(DashboardContext)
  const canManageCoffeeChats = dashboard?.canManageCoffeeChats ?? false

  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const [round, setRound] = useState<RoundDetails | null>(null)
  const [signups, setSignups] = useState<SignupItem[]>([])
  const [pairs, setPairs] = useState<PairItem[]>([])
  const [leftoutMembers, setLeftoutMembers] = useState<MemberInfo[]>([])
  const [allMembers, setAllMembers] = useState<MemberInfo[]>([])

  // Manual pair drafting before pairing
  const [draftPairs, setDraftPairs] = useState<DraftPair[]>([])
  const [selectedPerson1, setSelectedPerson1] = useState<string>('')
  const [selectedPerson2, setSelectedPerson2] = useState<string>('')
  const [selectedPerson3, setSelectedPerson3] = useState<string>('')
  const [showPerson3, setShowPerson3] = useState<boolean>(false)

  // Replace member modal state
  const [replaceTarget, setReplaceTarget] = useState<{
    pairId: string
    pairNumber: number
    spot: 'person1' | 'person2' | 'person3'
    currentMember: MemberInfo
    partnerName: string
  } | null>(null)
  const [newReplacementMemberId, setNewReplacementMemberId] = useState<string>('')

  const loadRoundData = useCallback(async () => {
    if (isCoffeeChatsDemoClient()) {
      await Promise.resolve()
      const isAugust = roundId.includes('august')
      const mockRound: RoundDetails = {
        id: roundId,
        month: isAugust ? '2026-08' : '2026-07',
        status: isAugust ? 'open' : 'paired',
        signupDeadline: '2026-08-21T21:59:00.000Z',
        meetDeadline: '2026-08-31T21:59:00.000Z',
        createdAt: '2026-08-01T09:00:00.000Z',
        pairingDate: isAugust ? null : '2026-07-12T14:30:00.000Z',
      }

      const mockMembers: MemberInfo[] = [
        { id: 1, name: 'Yesi Demo', department: 'Web3 Talents', email: 'yesi.demo@tum-blockchain.com', interests: ['Blockchain', 'DeFi'] },
        { id: 2, name: 'Alex Morgan', department: 'IT & Development', email: 'alex.morgan@tum-blockchain.com', interests: ['Software Dev', 'AI'] },
        { id: 3, name: 'Mina Bauer', department: 'Research', email: 'mina.bauer@tum-blockchain.com', interests: ['Cryptography', 'ZK'] },
        { id: 4, name: 'Jonas Keller', department: 'Industry', email: 'jonas.keller@tum-blockchain.com', interests: ['Ventures', 'FinTech'] },
        { id: 5, name: 'Elena Rost', department: 'Events', email: 'elena.rost@tum-blockchain.com', interests: ['Marketing', 'Events'] },
        { id: 6, name: 'Lucas Meyer', department: 'Education', email: 'lucas.meyer@tum-blockchain.com', interests: ['Education', 'Solidity'] },
        { id: 7, name: 'Sophie Weber', department: 'IT & Development', email: 'sophie.weber@tum-blockchain.com', interests: ['Frontend', 'UI/UX'] },
      ]

      const mockSignups: SignupItem[] = mockMembers.map((m, idx) => ({
        id: `signup-${m.id}`,
        memberId: m.id,
        signedUpAt: `2026-08-0${idx + 2}T10:00:00.000Z`,
        name: m.name,
        department: m.department,
        email: m.email,
        interests: m.interests ?? [],
      }))

      setRound(mockRound)
      setSignups(mockSignups)
      setAllMembers(mockMembers)

      if (!isAugust) {
        setPairs([
          {
            id: 'pair-1',
            roundId,
            status: 'pending',
            createdAt: '2026-07-12T14:30:00.000Z',
            person1: mockMembers[0],
            person2: mockMembers[1],
            person3: null,
            icebreakers: ['What pulled you into crypto?'],
          },
          {
            id: 'pair-2',
            roundId,
            status: 'pending',
            createdAt: '2026-07-12T14:30:00.000Z',
            person1: mockMembers[2],
            person2: mockMembers[3],
            person3: null,
            icebreakers: ['Favourite Munich coffee spot?'],
          },
          {
            id: 'pair-3',
            roundId,
            status: 'pending',
            createdAt: '2026-07-12T14:30:00.000Z',
            person1: mockMembers[4],
            person2: mockMembers[5],
            person3: null,
            icebreakers: ['Favourite Munich coffee spot?'],
          },
        ])
        setLeftoutMembers([mockMembers[6]]) // Sophie is odd/left out
      } else {
        setPairs([])
        setLeftoutMembers([])
      }

      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/coffee-chats/rounds/${roundId}`)
      const data = (await res.json()) as {
        ok?: boolean
        round?: RoundDetails
        signups?: SignupItem[]
        pairs?: PairItem[]
        leftoutMembers?: MemberInfo[]
        allMembers?: MemberInfo[]
        error?: string
      }

      if (!res.ok || !data.ok || !data.round) {
        toast.error(data.error ?? 'Failed to load round details.')
        setLoading(false)
        return
      }

      setRound(data.round)
      setSignups(data.signups ?? [])
      setPairs(data.pairs ?? [])
      setLeftoutMembers(data.leftoutMembers ?? [])
      setAllMembers(data.allMembers ?? [])
    } catch (err) {
      console.error('[CoffeeChatRoundDetailView] error loading round:', err)
      toast.error('An error occurred while loading round details.')
    } finally {
      setLoading(false)
    }
  }, [roundId])

  useEffect(() => {
    if (!canManageCoffeeChats) {
      router.replace('/coffee-chats')
      return
    }
    const load = async () => {
      await loadRoundData()
    }
    void load()
  }, [canManageCoffeeChats, router, loadRoundData])

  // Registered members that are not yet placed into draft pairs
  const draftPairedMemberIds = useMemo(() => {
    const ids = new Set<number>()
    for (const dp of draftPairs) {
      ids.add(dp.person1Id)
      ids.add(dp.person2Id)
      if (dp.person3Id) ids.add(dp.person3Id)
    }
    return ids
  }, [draftPairs])

  const availableSignupsForDraft = useMemo(() => {
    return signups.filter((s) => !draftPairedMemberIds.has(s.memberId))
  }, [signups, draftPairedMemberIds])

  // Leftout members during draft phase (if any signups remain unassigned)
  const draftLeftoutSignups = useMemo(() => {
    if (draftPairs.length === 0) return []
    return signups.filter((s) => !draftPairedMemberIds.has(s.memberId))
  }, [signups, draftPairedMemberIds, draftPairs])

  function handleAddDraftPair() {
    if (!selectedPerson1 || !selectedPerson2) {
      toast.error('Please select both members for the pair.')
      return
    }
    if (selectedPerson1 === selectedPerson2) {
      toast.error('Cannot pair a member with themselves.')
      return
    }
    const p1 = Number(selectedPerson1)
    const p2 = Number(selectedPerson2)
    const p3 = selectedPerson3 ? Number(selectedPerson3) : null

    if (p3 && (p3 === p1 || p3 === p2)) {
      toast.error('Third person must be distinct.')
      return
    }

    setDraftPairs((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        person1Id: p1,
        person2Id: p2,
        person3Id: p3,
      },
    ])

    setSelectedPerson1('')
    setSelectedPerson2('')
    setSelectedPerson3('')
    setShowPerson3(false)
    toast.success('Pair added to draft.')
  }

  function handleRemoveDraftPair(id: string) {
    setDraftPairs((prev) => prev.filter((p) => p.id !== id))
  }

  function handleAutoDraftPairs() {
    if (signups.length < 2) {
      toast.error('Need at least 2 signups to pair.')
      return
    }

    startTransition(async () => {
      try {
        let results: Array<Omit<DraftPair, 'id'>>
        if (isCoffeeChatsDemoClient()) {
          results = runPairing(signups.map((s) => ({
            id: s.memberId,
            interests: s.interests,
            alreadyKnow: [],
            priorPartners: [],
          })))
        } else {
          const response = await fetch('/api/coffee-chats/run-pairing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roundId, preview: true }),
          })
          const data = await response.json() as {
            ok?: boolean
            pairs?: Array<Omit<DraftPair, 'id'>>
            error?: string
          }
          if (!response.ok || !data.ok || !data.pairs) {
            toast.error(data.error ?? 'Could not suggest pairs.')
            return
          }
          results = data.pairs
        }

        const newDrafts = results.map((pair) => ({ ...pair, id: crypto.randomUUID() }))
        setDraftPairs(newDrafts)
        toast.success(`Drafted ${newDrafts.length} pairs from ${signups.length} signups.`)
      } catch {
        toast.error('Could not suggest pairs. Please try again.')
      }
    })
  }

  function handleCommitPairing(custom = false) {
    startTransition(async () => {
      if (isCoffeeChatsDemoClient()) {
        const demoPairs: PairItem[] = (custom && draftPairs.length > 0 ? draftPairs : [
          { id: 'dp-1', person1Id: 1, person2Id: 2, person3Id: null },
          { id: 'dp-2', person1Id: 3, person2Id: 4, person3Id: null },
          { id: 'dp-3', person1Id: 5, person2Id: 6, person3Id: null },
        ]).map((dp, idx) => {
          const m1 = allMembers.find((m) => m.id === dp.person1Id)!
          const m2 = allMembers.find((m) => m.id === dp.person2Id)!
          const m3 = dp.person3Id ? allMembers.find((m) => m.id === dp.person3Id) : null
          return {
            id: `pair-${idx + 1}`,
            roundId,
            status: 'pending',
            createdAt: new Date().toISOString(),
            person1: m1,
            person2: m2,
            person3: m3 ?? null,
            icebreakers: ['What was your first web3 experience?'],
          }
        })

        const pairedIds = new Set<number>()
        for (const p of demoPairs) {
          pairedIds.add(p.person1.id)
          pairedIds.add(p.person2.id)
          if (p.person3) pairedIds.add(p.person3.id)
        }

        const leftout = signups
          .filter((s) => !pairedIds.has(s.memberId))
          .map((s) => ({ id: s.memberId, name: s.name, department: s.department, email: s.email }))

        setRound((prev) => (prev ? { ...prev, status: 'paired', pairingDate: new Date().toISOString() } : null))
        setPairs(demoPairs)
        setLeftoutMembers(leftout)
        setDraftPairs([])
        toast.success(`Demo pairing committed. ${demoPairs.length} pairs created.`)
        return
      }

      const bodyPayload = custom && draftPairs.length > 0
        ? { roundId, customPairs: draftPairs }
        : { roundId }

      const res = await fetch('/api/coffee-chats/run-pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
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
        toast.error(json.error ?? 'Pairing failed. Check server logs.')
        return
      }

      const emailSummary = json.emailsFailed
        ? `${json.emailsSent ?? 0} emails sent, ${json.emailsFailed} failed.`
        : `${json.emailsSent ?? 0} emails sent.`
      toast.success(`Paired into ${json.pairsCreated} pairs. ${emailSummary}`)
      setDraftPairs([])
      await loadRoundData()
    })
  }

  function handleReplaceMember() {
    if (!replaceTarget || !newReplacementMemberId) {
      toast.error('Please select a replacement member.')
      return
    }

    const newMemberIdNum = Number(newReplacementMemberId)
    const target = replaceTarget

    startTransition(async () => {
      if (isCoffeeChatsDemoClient()) {
        const replacement = allMembers.find((m) => m.id === newMemberIdNum)
        if (replacement) {
          setPairs((prev) =>
            prev.map((p) => {
              if (p.id !== target.pairId) return p
              return {
                ...p,
                [target.spot]: replacement,
              }
            }),
          )
          toast.success(`Demo: Replaced ${target.currentMember.name} with ${replacement.name}. Match email simulated.`)
        }
        setReplaceTarget(null)
        setNewReplacementMemberId('')
        return
      }

      const res = await fetch(`/api/coffee-chats/rounds/${roundId}/replace-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairId: target.pairId,
          spot: target.spot,
          newMemberId: newMemberIdNum,
        }),
      })

      const json = (await res.json()) as { ok?: boolean; message?: string; error?: string }

      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Failed to replace member.')
        return
      }

      toast.success(json.message ?? 'Member replaced and match email sent.')
      setReplaceTarget(null)
      setNewReplacementMemberId('')
      await loadRoundData()
    })
  }

  function statusVariant(status: string): 'default' | 'secondary' | 'outline' {
    if (status === 'open') return 'secondary'
    if (status === 'paired') return 'default'
    return 'outline'
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!round) {
    return (
      <Empty className="mx-auto max-w-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HelpCircleIcon />
          </EmptyMedia>
          <EmptyTitle>Round not found</EmptyTitle>
          <EmptyDescription>The requested Coffee Chat round does not exist.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const isPaired = round.status === 'paired' || round.status === 'closed'
  const isOddSignups = signups.length % 2 !== 0

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      {/* Back button & Title header */}
      <div className="flex flex-col gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground hover:text-foreground">
            <Link href="/coffee-chats/admin">
              <ArrowLeftIcon className="size-4 mr-1.5" />
              All rounds
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {formatCoffeeChatMonth(round.month)} Round
            </h2>
            <Badge variant={statusVariant(round.status)} className="capitalize text-xs">
              {round.status}
            </Badge>
          </div>
          {round.status === 'open' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoDraftPairs}
                disabled={isPending || signups.length < 2}
              >
                <SparklesIcon className="size-4 mr-1.5" />
                Auto-suggest Pairs
              </Button>
              <Button
                size="sm"
                onClick={() => handleCommitPairing(false)}
                disabled={isPending || signups.length < 2}
              >
                {isPending ? <Spinner data-icon="inline-start" /> : <PlayIcon data-icon="inline-start" />}
                Run Automatic Pairing
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Round Dates Card */}
      <Card className="border-border bg-background/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="size-4 text-primary" />
            Round Dates & Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1 p-3 rounded-lg border border-border bg-card/40">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Round Creation Date
              </span>
              <span className="text-sm font-semibold text-foreground">
                {formatCoffeeChatDate(round.createdAt)}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg border border-border bg-card/40">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Registration Deadline
              </span>
              <span className="text-sm font-semibold text-foreground">
                {round.signupDeadline ? formatCoffeeChatDate(round.signupDeadline) : 'No deadline set'}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg border border-border bg-card/40">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Pairing Date
              </span>
              <span className="text-sm font-semibold text-foreground">
                {round.pairingDate ? (
                  formatCoffeeChatDate(round.pairingDate)
                ) : (
                  <span className="text-muted-foreground italic font-normal">Not paired yet</span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 1. VIEW WHEN PAIRED                                                       */}
      {/* ========================================================================= */}
      {isPaired && (
        <div className="flex flex-col gap-6">
          {/* Leftout member banner (if total signups is odd or someone remained unpaired) */}
          {leftoutMembers.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-amber-500 flex items-center gap-2">
                  <UserMinusIcon className="size-4" />
                  Leftout Member (Odd number of registrations)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  The following member was not assigned to a 2-person pair. You can replace an existing pair spot with this member below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {leftoutMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-amber-500/20 bg-background text-sm"
                    >
                      <span className="font-medium text-foreground">{member.name}</span>
                      {member.department && (
                        <span className="text-xs text-muted-foreground">({member.department})</span>
                      )}
                      {member.email && (
                        <span className="text-xs text-muted-foreground">&bull; {member.email}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Matched Pairs List in order */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <UsersIcon className="size-5 text-primary" />
                Matched Pairs ({pairs.length})
              </h3>
              <span className="text-xs text-muted-foreground">
                Replace a member before the meeting is completed. Completed meetings cannot be changed.
              </span>
            </div>

            {pairs.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UsersIcon />
                  </EmptyMedia>
                  <EmptyTitle>No pairs created</EmptyTitle>
                  <EmptyDescription>This round does not have any generated pairings yet.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-3">
                {pairs.map((pair, index) => (
                  <Card key={pair.id} className="border-border bg-background/50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border text-xs">
                      <span className="font-semibold text-foreground">Pair #{index + 1}</span>
                      <Badge variant={pair.status === 'met' ? 'default' : 'secondary'} className="text-[10px] py-0 px-2">
                        {pair.status === 'met' ? 'Met' : 'Pending'}
                      </Badge>
                    </div>
                    <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                      {/* Spot 1 */}
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            Spot 1
                          </span>
                          <span className="font-semibold text-foreground text-sm">{pair.person1.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {pair.person1.department ?? 'Member'} &bull; {pair.person1.email ?? 'No email'}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs shrink-0 ml-2"
                          disabled={isPending || pair.status === 'met'}
                          onClick={() => {
                            setReplaceTarget({
                              pairId: pair.id,
                              pairNumber: index + 1,
                              spot: 'person1',
                              currentMember: pair.person1,
                              partnerName: pair.person2.name,
                            })
                            setNewReplacementMemberId('')
                          }}
                        >
                          <RefreshCwIcon className="size-3.5 mr-1" />
                          Replace
                        </Button>
                      </div>

                      {/* Spot 2 */}
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            Spot 2
                          </span>
                          <span className="font-semibold text-foreground text-sm">{pair.person2.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {pair.person2.department ?? 'Member'} &bull; {pair.person2.email ?? 'No email'}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs shrink-0 ml-2"
                          disabled={isPending || pair.status === 'met'}
                          onClick={() => {
                            setReplaceTarget({
                              pairId: pair.id,
                              pairNumber: index + 1,
                              spot: 'person2',
                              currentMember: pair.person2,
                              partnerName: pair.person1.name,
                            })
                            setNewReplacementMemberId('')
                          }}
                        >
                          <RefreshCwIcon className="size-3.5 mr-1" />
                          Replace
                        </Button>
                      </div>

                      {/* Spot 3 if trio */}
                      {pair.person3 && (
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60 md:col-span-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                              Spot 3 (Trio)
                            </span>
                            <span className="font-semibold text-foreground text-sm">{pair.person3.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {pair.person3.department ?? 'Member'} &bull; {pair.person3.email ?? 'No email'}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs shrink-0 ml-2"
                            disabled={isPending || pair.status === 'met'}
                            onClick={() => {
                              setReplaceTarget({
                                pairId: pair.id,
                                pairNumber: index + 1,
                                spot: 'person3',
                                currentMember: pair.person3!,
                                partnerName: `${pair.person1.name} & ${pair.person2.name}`,
                              })
                              setNewReplacementMemberId('')
                            }}
                          >
                            <RefreshCwIcon className="size-3.5 mr-1" />
                            Replace
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW WHEN OPEN (BEFORE PAIRING)                                        */}
      {/* ========================================================================= */}
      {!isPaired && (
        <div className="flex flex-col gap-8">
          {/* Registered Signups Table */}
          <Card className="border-border bg-background/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheckIcon className="size-4 text-primary" />
                    Registered Members ({signups.length})
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {isOddSignups ? (
                      <span className="text-amber-500 font-medium">
                        Odd number of registered members ({signups.length}). One person will be left out or placed in a 3-person group.
                      </span>
                    ) : (
                      'All members who have signed up for this round.'
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {signups.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UsersIcon />
                    </EmptyMedia>
                    <EmptyTitle>No registrations yet</EmptyTitle>
                    <EmptyDescription>Members who sign up for this round will appear here.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Member</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Interests</TableHead>
                      <TableHead className="text-right">Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signups.map((signup) => (
                      <TableRow key={signup.id} className="border-border">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-foreground">{signup.name}</span>
                            <span className="text-xs text-muted-foreground">{signup.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {signup.department ?? '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {signup.interests.slice(0, 3).map((int) => (
                              <Badge key={int} variant="secondary" className="text-[10px] py-0 px-1.5">
                                {int}
                              </Badge>
                            ))}
                            {signup.interests.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{signup.interests.length - 3} more
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatCoffeeChatDate(signup.signedUpAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Manual Pair Selection & Draft Pairing */}
          <Card className="border-border bg-background/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UsersIcon className="size-4 text-primary" />
                    Manual Pair Selection (Pre-pairing)
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Manually build or adjust pairs before running the pairing. You can also use &quot;Auto-suggest Pairs&quot; to prefill.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {/* Pair Builder Form */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col gap-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Create a custom pair
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Person 1 */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground">Person 1</label>
                    <Select value={selectedPerson1} onValueChange={setSelectedPerson1}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select member 1…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSignupsForDraft
                          .filter((s) => String(s.memberId) !== selectedPerson2 && String(s.memberId) !== selectedPerson3)
                          .map((s) => (
                            <SelectItem key={s.memberId} value={String(s.memberId)}>
                              {s.name} {s.department ? `(${s.department})` : ''}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Person 2 */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground">Person 2</label>
                    <Select value={selectedPerson2} onValueChange={setSelectedPerson2}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select member 2…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSignupsForDraft
                          .filter((s) => String(s.memberId) !== selectedPerson1 && String(s.memberId) !== selectedPerson3)
                          .map((s) => (
                            <SelectItem key={s.memberId} value={String(s.memberId)}>
                              {s.name} {s.department ? `(${s.department})` : ''}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Optional Person 3 */}
                  {showPerson3 ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-foreground">Person 3 (Trio)</label>
                        <button
                          type="button"
                          className="text-[10px] text-destructive hover:underline"
                          onClick={() => {
                            setShowPerson3(false)
                            setSelectedPerson3('')
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      <Select value={selectedPerson3} onValueChange={setSelectedPerson3}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select member 3…" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSignupsForDraft
                            .filter((s) => String(s.memberId) !== selectedPerson1 && String(s.memberId) !== selectedPerson2)
                            .map((s) => (
                              <SelectItem key={s.memberId} value={String(s.memberId)}>
                                {s.name} {s.department ? `(${s.department})` : ''}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground h-9"
                        onClick={() => setShowPerson3(true)}
                      >
                        + Add 3rd Person (Trio)
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleAddDraftPair}
                    disabled={!selectedPerson1 || !selectedPerson2}
                  >
                    <UserPlusIcon className="size-4 mr-1.5" />
                    Add Pair to Draft
                  </Button>
                </div>
              </div>

              {/* Draft pairs list */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">
                    Drafted Pairs ({draftPairs.length})
                  </h4>
                  {draftPairs.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => setDraftPairs([])}
                    >
                      Clear Draft
                    </Button>
                  )}
                </div>

                {draftPairs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No draft pairs added yet. Select members above or click &quot;Auto-suggest Pairs&quot;.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {draftPairs.map((dp, idx) => {
                      const m1 = signups.find((s) => s.memberId === dp.person1Id)
                      const m2 = signups.find((s) => s.memberId === dp.person2Id)
                      const m3 = dp.person3Id ? signups.find((s) => s.memberId === dp.person3Id) : null

                      return (
                        <div
                          key={dp.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60 text-sm"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-muted-foreground">Pair #{idx + 1}</span>
                            <span className="font-medium text-foreground">
                              {m1?.name ?? 'Member 1'} &amp; {m2?.name ?? 'Member 2'}
                              {m3 ? ` & ${m3.name}` : ''}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                            onClick={() => handleRemoveDraftPair(dp.id)}
                            title="Remove pair"
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Leftout preview in draft */}
                {draftLeftoutSignups.length > 0 && (
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs">
                    <span className="font-semibold text-amber-500">Unpaired / Leftout registered members: </span>
                    <span className="text-muted-foreground">
                      {draftLeftoutSignups.map((s) => s.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Commit Pairings action */}
              {draftPairs.length > 0 && (
                <div className="pt-3 border-t border-border flex justify-end">
                  <Button
                    onClick={() => handleCommitPairing(true)}
                    disabled={isPending}
                    className="w-full sm:w-auto"
                  >
                    {isPending ? <Spinner data-icon="inline-start" /> : <CheckCircle2Icon data-icon="inline-start" />}
                    Confirm &amp; Run Pairing ({draftPairs.length} pairs)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REPLACE MEMBER MODAL (AFTER PAIRING)                                   */}
      {/* ========================================================================= */}
      <Dialog
        open={replaceTarget !== null}
        onOpenChange={(open) => !open && setReplaceTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Replace Member in Pair #{replaceTarget?.pairNumber}
            </DialogTitle>
            <DialogDescription>
              Currently matched with <strong className="text-foreground">{replaceTarget?.partnerName}</strong>. Select another member to take this spot.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-sm flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Current Member
              </span>
              <span className="font-medium text-foreground">{replaceTarget?.currentMember.name}</span>
              <span className="text-xs text-muted-foreground">{replaceTarget?.currentMember.email}</span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-foreground">
                Choose Replacement Member
              </label>
              <Select value={newReplacementMemberId} onValueChange={setNewReplacementMemberId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a member…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {/* Highlight leftout members if any */}
                  {leftoutMembers.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-[11px] font-semibold text-amber-500 uppercase tracking-wider">
                        Leftout Members (Unmatched)
                      </div>
                      {leftoutMembers
                        .filter((m) => m.id !== replaceTarget?.currentMember.id)
                        .map((member) => (
                          <SelectItem key={`leftout-${member.id}`} value={String(member.id)}>
                            <span className="font-semibold text-amber-500">{member.name} (Leftout)</span>
                            {member.department && (
                              <span className="text-xs text-muted-foreground ml-2">({member.department})</span>
                            )}
                          </SelectItem>
                        ))}
                      <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-t border-border mt-1">
                        All Club Members
                      </div>
                    </>
                  )}

                  {allMembers
                    .filter((m) => m.id !== replaceTarget?.currentMember.id)
                    .map((member) => (
                      <SelectItem key={member.id} value={String(member.id)}>
                        <span className="font-medium">{member.name}</span>
                        {member.department && (
                          <span className="text-xs text-muted-foreground ml-2">({member.department})</span>
                        )}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                ⚠️ Confirming will update the pair spot and immediately trigger a match email to the newly replaced member.
              </p>
            </div>
          </div>

          <DialogFooter showCloseButton={false}>
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleReplaceMember}
              disabled={isPending || !newReplacementMemberId}
            >
              {isPending ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
              {isPending ? 'Replacing…' : 'Replace & Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { PlusIcon, PlayIcon, UsersIcon } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Round {
  id: string
  month: string
  status: string
  signup_deadline: string | null
  meet_deadline: string | null
  created_at: string
}

export default function CoffeeChatsAdminPage() {
  const supabase = getSupabaseBrowserClient()
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
  }, [supabase])

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
        signup_deadline: newSignupDeadline || null,
        meet_deadline: newMeetDeadline || null,
        status: 'open',
      }).select().single()

      if (error) { toast.error(error.message); return }

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
        toast.error(json.error ?? 'Pairing failed')
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
      <div className="max-w-4xl mx-auto">
        <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto">
        <Card className="border-border bg-background/50">
          <CardHeader>
            <CardTitle className="text-white">Access Denied</CardTitle>
            <CardDescription className="text-white/50">
              This page is for Coffee Chats administrators only.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Coffee Chats Admin</h2>
        <p className="text-white/60 text-sm">Manage rounds and run pairings.</p>
      </div>

      {/* Create round */}
      <Card className="border-border bg-background/50">
        <CardHeader>
          <CardTitle className="text-white text-base">Create New Round</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-white/80">Month</Label>
              <Input
                type="month"
                value={newMonth}
                onChange={(e) => setNewMonth(e.target.value)}
                className="bg-background/80"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">Sign-up deadline</Label>
              <Input
                type="datetime-local"
                value={newSignupDeadline}
                onChange={(e) => setNewSignupDeadline(e.target.value)}
                className="bg-background/80"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">Meet deadline</Label>
              <Input
                type="datetime-local"
                value={newMeetDeadline}
                onChange={(e) => setNewMeetDeadline(e.target.value)}
                className="bg-background/80"
              />
            </div>
          </div>
          <Button onClick={handleCreateRound} disabled={isPending}>
            <PlusIcon data-icon="inline-start" />
            Create Round
          </Button>
        </CardContent>
      </Card>

      {/* Rounds table */}
      <Card className="border-border bg-background/50">
        <CardHeader>
          <CardTitle className="text-white text-base">All Rounds</CardTitle>
        </CardHeader>
        <CardContent>
          {rounds.length === 0 ? (
            <p className="text-white/50 text-sm">No rounds yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-white/60">Month</TableHead>
                  <TableHead className="text-white/60">Status</TableHead>
                  <TableHead className="text-white/60 text-center">
                    <UsersIcon className="inline size-4" /> Signups
                  </TableHead>
                  <TableHead className="text-white/60 text-center">Pairs</TableHead>
                  <TableHead className="text-white/60">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rounds.map((round) => (
                  <TableRow key={round.id} className="border-border">
                    <TableCell className="text-white font-medium">{round.month}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(round.status)}>{round.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-white/70">
                      {signupCounts[round.id] ?? 0}
                    </TableCell>
                    <TableCell className="text-center text-white/70">
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

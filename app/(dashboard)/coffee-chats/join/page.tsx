'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CheckCircleIcon, CalendarIcon, ClockIcon } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Round {
  id: string
  month: string
  status: string
  signup_deadline: string | null
  meet_deadline: string | null
}

export default function JoinRoundPage() {
  const supabase = getSupabaseBrowserClient()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [round, setRound] = useState<Round | null>(null)
  const [isSignedUp, setIsSignedUp] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Get open round
      const { data: openRound } = await supabase
        .from('cc_rounds')
        .select('id, month, status, signup_deadline, meet_deadline')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setRound(openRound as Round | null)

      if (openRound) {
        // Check signup status
        const { data: member } = await supabase
          .from('members_main')
          .select('id')
          .ilike('"TBC Email"', user.email ?? '')
          .maybeSingle()

        if (member) {
          const { data: signup } = await supabase
            .from('cc_signups')
            .select('id')
            .eq('round_id', openRound.id)
            .eq('member_id', (member as { id: number }).id)
            .maybeSingle()
          setIsSignedUp(Boolean(signup))
        }
      }

      setLoading(false)
    }
    void load()
  }, [supabase])

  function handleSignUp() {
    startTransition(async () => {
      const response = await fetch('/api/coffee-chats/signup', { method: 'POST' })
      const json = await response.json() as { ok?: boolean; alreadySignedUp?: boolean; error?: string }

      if (!response.ok || !json.ok) {
        toast.error(json.error ?? 'Signup failed')
        return
      }

      if (json.alreadySignedUp) {
        toast.info('You are already signed up for this round.')
      } else {
        toast.success('Signed up! We will email you your match once pairings are done.')
      }
      setIsSignedUp(true)
    })
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Join This Round</h2>
        <p className="text-white/60 text-sm">
          Sign up to be matched with a fellow TBC member for a coffee chat this month.
        </p>
      </div>

      {!round ? (
        <Card className="border-border bg-background/50">
          <CardHeader>
            <CardTitle className="text-white">No open round</CardTitle>
            <CardDescription className="text-white/50">
              There is no open coffee chat round right now. Check back soon — rounds typically open at the start of each month.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="border-border bg-background/50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-white text-lg">{round.month} Round</CardTitle>
                <CardDescription className="text-white/50 mt-1">
                  Sign up to be included in this month&apos;s pairings.
                </CardDescription>
              </div>
              <Badge variant={isSignedUp ? 'default' : 'secondary'}>
                {isSignedUp ? 'Signed Up' : 'Open'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {round.signup_deadline && (
              <div className="flex items-center gap-2 text-sm text-white/60">
                <ClockIcon className="size-4 shrink-0" />
                <span>Sign-up deadline: <span className="text-white/80">{new Date(round.signup_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></span>
              </div>
            )}
            {round.meet_deadline && (
              <div className="flex items-center gap-2 text-sm text-white/60">
                <CalendarIcon className="size-4 shrink-0" />
                <span>Meet by: <span className="text-white/80">{new Date(round.meet_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></span>
              </div>
            )}

            {isSignedUp ? (
              <div className="flex items-center gap-2 text-sm text-green-400 mt-2">
                <CheckCircleIcon className="size-4 shrink-0" />
                <span>You are signed up for this round. Your match will be emailed to you once pairings are done.</span>
              </div>
            ) : (
              <Button onClick={handleSignUp} disabled={isPending} className="w-full sm:w-auto">
                {isPending ? 'Signing up…' : 'Sign Up for This Round'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

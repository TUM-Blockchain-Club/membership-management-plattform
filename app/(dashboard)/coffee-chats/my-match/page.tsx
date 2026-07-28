'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CameraIcon, CheckCircleIcon, StarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Partner {
  id: number
  Name: string | null
  Department: string | null
  cc_interests: string[] | null
  cc_favourite_coffee: string | null
  cc_fun_fact: string | null
}

interface Pair {
  id: string
  status: string
  icebreaker_q1: string | null
  icebreaker_q2: string | null
  icebreaker_q3: string | null
  selfie_url: string | null
  date_met: string | null
}

interface Round {
  month: string
  meet_deadline: string | null
}

interface MatchData {
  pair: Pair
  partners: Partner[]
  round: Round
}

export default function MyMatchPage() {
  const [loading, setLoading] = useState(true)
  const [match, setMatch] = useState<MatchData | null>(null)
  const [isPending, startTransition] = useTransition()
  const [highlightNote, setHighlightNote] = useState('')
  const [rating, setRating] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/coffee-chats/my-match')
      const json = await res.json() as { match?: MatchData | null; error?: string }
      if (json.match) setMatch(json.match)
      setLoading(false)
    }
    void load()
  }, [])

  function handleLogMeeting(selfieFile?: File) {
    startTransition(async () => {
      if (!match) return
      const form = new FormData()
      form.append('pairId', match.pair.id)
      form.append('dateMet', new Date().toISOString().split('T')[0])
      if (rating > 0) form.append('rating', String(rating))
      if (highlightNote) form.append('highlightNote', highlightNote)
      if (selfieFile) form.append('selfie', selfieFile)

      const res = await fetch('/api/coffee-chats/log-meeting', { method: 'POST', body: form })
      const json = await res.json() as { ok?: boolean; error?: string; selfieUrl?: string }

      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Failed to log meeting')
        return
      }

      toast.success('Meeting logged!')
      setMatch((prev) =>
        prev
          ? {
              ...prev,
              pair: {
                ...prev.pair,
                status: 'met',
                selfie_url: json.selfieUrl ?? prev.pair.selfie_url,
              },
            }
          : prev
      )
    })
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
        <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-2">My Match</h2>
        <Card className="border-border bg-background/50">
          <CardHeader>
            <CardTitle className="text-white">No match yet</CardTitle>
            <CardDescription className="text-white/50">
              Once pairings are done for your round, your match will appear here.
              Make sure you are signed up for the current round!
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { pair, partners, round } = match
  const questions = [pair.icebreaker_q1, pair.icebreaker_q2, pair.icebreaker_q3].filter(Boolean)
  const hasMet = pair.status === 'met'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Your Match — {round.month}</h2>
          {round.meet_deadline && (
            <p className="text-white/60 text-sm">
              Try to meet before {new Date(round.meet_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.
            </p>
          )}
        </div>
        <Badge variant={hasMet ? 'default' : 'secondary'}>{hasMet ? 'Met' : 'Pending'}</Badge>
      </div>

      {/* Partners */}
      <div className="space-y-3">
        {partners.map((partner) => (
          <Card key={partner.id} className="border-border bg-background/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">{partner.Name ?? 'Your match'}</CardTitle>
              {partner.Department && (
                <CardDescription className="text-white/50">{partner.Department}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {partner.cc_interests?.length ? (
                <div className="flex flex-wrap gap-1">
                  {partner.cc_interests.map((i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-white/10 text-white/70 text-xs">{i}</span>
                  ))}
                </div>
              ) : null}
              {partner.cc_favourite_coffee && (
                <p className="text-white/60">Favourite coffee: <span className="text-white/80">{partner.cc_favourite_coffee}</span></p>
              )}
              {partner.cc_fun_fact && (
                <p className="text-white/60">Fun fact: <span className="text-white/80">{partner.cc_fun_fact}</span></p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ice-breakers */}
      {questions.length > 0 && (
        <Card className="border-border bg-background/50">
          <CardHeader>
            <CardTitle className="text-white text-base">Ice-breaker Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.map((q, i) => (
              <p key={i} className="text-white/70 text-sm">
                <span className="text-white/40 mr-2">{i + 1}.</span>{q}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Selfie */}
      {pair.selfie_url && (
        <Card className="border-border bg-background/50">
          <CardHeader>
            <CardTitle className="text-white text-base">Your Selfie</CardTitle>
          </CardHeader>
          <CardContent>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pair.selfie_url}
              alt="Coffee chat selfie"
              className="rounded-lg w-full max-w-sm object-cover"
            />
          </CardContent>
        </Card>
      )}

      {/* Log meeting */}
      {!hasMet && (
        <Card className="border-border bg-background/50">
          <CardHeader>
            <CardTitle className="text-white text-base">Log Your Meeting</CardTitle>
            <CardDescription className="text-white/50">
              After you have met, record it here. You can optionally add a selfie and leave a highlight.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Rating */}
            <div className="space-y-1.5">
              <Label className="text-white/80">Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`transition-colors ${n <= rating ? 'text-yellow-400' : 'text-white/20 hover:text-white/40'}`}
                  >
                    <StarIcon className="size-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>

            {/* Highlight */}
            <div className="space-y-1.5">
              <Label htmlFor="highlight" className="text-white/80">Highlight (optional)</Label>
              <Textarea
                id="highlight"
                placeholder="What was the most interesting thing you talked about?"
                value={highlightNote}
                onChange={(e) => setHighlightNote(e.target.value)}
                className="bg-background/80 resize-none"
                rows={2}
              />
            </div>

            {/* Selfie upload */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleLogMeeting(file)
              }}
            />

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleLogMeeting()}
                disabled={isPending}
              >
                <CheckCircleIcon data-icon="inline-start" />
                {isPending ? 'Logging…' : 'We Met!'}
              </Button>
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={isPending}
              >
                <CameraIcon data-icon="inline-start" />
                Upload Selfie
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {hasMet && !pair.selfie_url && (
        <Card className="border-border bg-background/50">
          <CardContent className="py-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleLogMeeting(file)
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={isPending}>
              <CameraIcon data-icon="inline-start" />
              {isPending ? 'Uploading…' : 'Upload Selfie'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { PlayIcon, Trash2Icon, UsersIcon } from 'lucide-react'
import { DateTimePicker } from '@/components/date-picker'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { isCoffeeChatsDemoClient } from '@/lib/coffee-chats'

export interface CoffeeChatAdminRound {
  id: string
  month: string
  status: string
  signup_deadline: string | null
  meet_deadline: string | null
  created_at: string
}

type Signup = { id: string; signed_up_at: string; member: { id: number; Name: string | null; Department: string | null } | null }
const localValue = (value: string | null) => value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : ''

export function CoffeeChatRoundDialog({ round, busy, onClose, onUpdated, onPair, onDelete }: {
  round: CoffeeChatAdminRound
  busy: boolean
  onClose: () => void
  onUpdated: (round: CoffeeChatAdminRound) => void
  onPair: () => void
  onDelete: () => void
}) {
  const [loadedRound, setLoadedRound] = useState(round)
  const [signup, setSignup] = useState(localValue(round.signup_deadline))
  const [meet, setMeet] = useState(localValue(round.meet_deadline))
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const dirty = signup !== localValue(loadedRound.signup_deadline) || meet !== localValue(loadedRound.meet_deadline)
  const disabled = busy || saving

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      try {
        if (isCoffeeChatsDemoClient()) {
          setSignups([])
          return
        }
        const response = await fetch(`/api/coffee-chats/rounds/${round.id}`, { signal: controller.signal, cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load round.')
        setLoadedRound(data.round)
        setSignup(localValue(data.round.signup_deadline))
        setMeet(localValue(data.round.meet_deadline))
        setSignups(data.signups)
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load round.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [round.id, attempt])

  async function save() {
    if (signup && meet && signup > meet) {
      toast.error('The signup deadline must be on or before the meeting deadline.')
      return
    }
    setSaving(true)
    try {
      // Preserve exact timestamps for fields that were not edited.
      const dates = {
        signup_deadline: signup === localValue(loadedRound.signup_deadline) ? loadedRound.signup_deadline : signup ? new Date(signup).toISOString() : null,
        meet_deadline: meet === localValue(loadedRound.meet_deadline) ? loadedRound.meet_deadline : meet ? new Date(meet).toISOString() : null,
      }
      let updated = { ...round, ...dates }
      if (!isCoffeeChatsDemoClient()) {
        const response = await fetch(`/api/coffee-chats/rounds/${round.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dates) })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not save deadlines.')
        updated = data.round
      }
      setLoadedRound(updated)
      onUpdated(updated)
      toast.success('Deadlines updated.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save deadlines.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !disabled) onClose() }}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl" showCloseButton={!disabled} onCloseAutoFocus={() => document.getElementById(`coffee-round-${round.id}`)?.focus()}>
        <DialogHeader className="shrink-0 border-b p-5 pr-12">
          <DialogTitle>Coffee Chat · {round.month}</DialogTitle>
          <DialogDescription>Review signups, edit deadlines and manage this round.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          <Badge variant="secondary">{round.status}</Badge>
          {loading ? <div className="space-y-3" aria-label="Loading round details"><Skeleton className="h-24 w-full" /><Skeleton className="h-32 w-full" /></div> : error ? (
            <div role="alert" className="space-y-3"><p className="text-destructive">{error}</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>Retry</Button></div>
          ) : <>
            <div className="space-y-4">
              <Field><FieldLabel htmlFor="round-signup">Sign-up deadline</FieldLabel><DateTimePicker id="round-signup" value={signup} onChange={setSignup} disabled={disabled} placeholder="No deadline" /></Field>
              <Field><FieldLabel htmlFor="round-meet">Meet deadline</FieldLabel><DateTimePicker id="round-meet" value={meet} onChange={setMeet} disabled={disabled} placeholder="No deadline" /></Field>
              <FieldDescription>Times use your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Clearing a date removes that deadline.</FieldDescription>
              <Button onClick={save} disabled={disabled || !dirty}>{saving ? 'Saving…' : 'Save deadlines'}</Button>
            </div>
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium"><UsersIcon className="size-4" />Signups <Badge variant="outline">{signups.length}</Badge></h3>
              {signups.length ? <ul className="divide-y rounded-lg border px-3">
                {signups.map(entry => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div><p className="font-medium">{entry.member?.Name || 'Member'}</p><p className="text-xs text-muted-foreground">{entry.member?.Department || 'No department'}</p></div>
                  <time className="text-xs text-muted-foreground" dateTime={entry.signed_up_at}>Joined {format(new Date(entry.signed_up_at), 'd MMM yyyy, HH:mm')}</time>
                </li>)}
              </ul> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{isCoffeeChatsDemoClient() ? 'Participant details are not available in demo mode.' : 'No members have signed up yet.'}</p>}
            </section>
          </>}
        </div>
        <DialogFooter className="mx-0 mb-0 shrink-0 sm:justify-between">
          <Button variant="outline" className="text-destructive" onClick={onDelete} disabled={disabled || loading || !!error}><Trash2Icon data-icon="inline-start" />Delete round</Button>
          {round.status === 'open' && <Button onClick={onPair} disabled={disabled || loading || !!error || dirty}><PlayIcon data-icon="inline-start" />{busy ? 'Pairing…' : 'Run pairing'}</Button>}
        </DialogFooter>
        {dirty && <p className="shrink-0 px-5 pb-3 text-xs text-muted-foreground">Save deadline changes before running pairing.</p>}
      </DialogContent>
    </Dialog>
  )
}

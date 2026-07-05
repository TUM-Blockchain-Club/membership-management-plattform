'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import Image from 'next/image'
import type { DashboardEvent } from '@/app/components/dashboard/types'
import { memberService } from '@/lib/members'
import { getPictureUrl } from '@/app/dashboard/lib/memberUtils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

type AttendanceMember = {
  member_id: number
  checked_in_at: string
  members_main: {
    id: number
    Name: string
    Picture: unknown
  } | null
}

type CheckInSummary = {
  event: Pick<DashboardEvent, 'id' | 'title' | 'check_in_enabled' | 'check_in_token'>
  attendance_count: number
  attendance_members: AttendanceMember[]
  can_manage_checkins: boolean
  is_checked_in: boolean
  check_in_url: string | null
}

type CheckInDialogProps = {
  event: DashboardEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCheckedIn?: () => void
  canManageCheckIns: boolean
}

export function CheckInDialog({
  event,
  open,
  onOpenChange,
  onCheckedIn,
  canManageCheckIns,
}: CheckInDialogProps) {
  const [summary, setSummary] = useState<CheckInSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [error, setError] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [memberResults, setMemberResults] = useState<Array<{ id: number; Name: string; Picture: unknown }>>([])
  const [memberSearchLoading, setMemberSearchLoading] = useState(false)
  const [savingMemberId, setSavingMemberId] = useState<number | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const checkInUrl = summary?.check_in_url ?? ''
  const canManage = canManageCheckIns || summary?.can_manage_checkins || false

  const refreshSummary = useCallback(async () => {
    if (!event) return

    const response = await fetch(`/api/events/${event.id}/checkin`)
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload?.error || 'Could not load check-in data.')
    }

    setSummary(payload as CheckInSummary)
  }, [event])

  useEffect(() => {
    if (!open || !event) return

    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError('')
      setSummary(null)
      setMemberQuery('')
      setMemberResults([])
      setCopyState('idle')
      try {
        await refreshSummary()
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load check-in data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [event, open, refreshSummary])

  useEffect(() => {
    if (!open || !summary) return
    if (summary.check_in_url) return
    if (!canManage) return

    const run = async () => {
      try {
        const response = await fetch(`/api/events/${event?.id}/checkin/token`, { method: 'POST' })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not create a check-in token.')
        }
        await refreshSummary()
      } catch (tokenError) {
        setError(tokenError instanceof Error ? tokenError.message : 'Could not create a check-in token.')
      }
    }

    void run()
  }, [canManage, event?.id, open, refreshSummary, summary])

  useEffect(() => {
    if (!checkInUrl) {
      void Promise.resolve().then(() => {
        if (!checkInUrl) {
          setQrDataUrl('')
        }
      })
      return
    }

    let cancelled = false
    const render = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(checkInUrl, {
          width: 768,
          margin: 1,
          errorCorrectionLevel: 'M',
        })

        if (!cancelled) {
          setQrDataUrl(dataUrl)
        }
      } catch {
        if (!cancelled) {
          setQrDataUrl('')
        }
      }
    }

    void render()

    return () => {
      cancelled = true
    }
  }, [checkInUrl])

  useEffect(() => {
    if (!open || !canManage) return

    const query = memberQuery.trim()
    if (query.length < 2) {
      void Promise.resolve().then(() => {
        setMemberResults([])
      })
      return
    }

    const timeout = setTimeout(async () => {
      setMemberSearchLoading(true)
      const { data, error: searchError } = await memberService.searchMembers(query)
      if (searchError) {
        setMemberResults([])
        setError(searchError.message)
      } else {
        setMemberResults((data ?? []).slice(0, 12))
      }
      setMemberSearchLoading(false)
    }, 250)

    return () => clearTimeout(timeout)
  }, [canManage, memberQuery, open])

  const copyLink = async () => {
    if (!checkInUrl) return
    await navigator.clipboard.writeText(checkInUrl)
    setCopyState('copied')
    setTimeout(() => setCopyState('idle'), 1500)
  }

  const handleCheckInMember = async (memberId: number) => {
    if (!event) return

    setSavingMemberId(memberId)
    setError('')
    try {
      const response = await fetch(`/api/events/${event.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not check in member.')
      }

      await refreshSummary()
      onCheckedIn?.()
    } catch (checkInError) {
      setError(checkInError instanceof Error ? checkInError.message : 'Could not check in member.')
    } finally {
      setSavingMemberId(null)
    }
  }

  const checkedInLabel = useMemo(() => {
    if (!summary) return '0 checked in'
    return `${summary.attendance_count} checked in`
  }, [summary])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>{event?.title ?? 'Check-in'}</DialogTitle>
          <DialogDescription>{checkedInLabel}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading check-in data...</p>
          ) : summary ? (
            <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="flex flex-col gap-4">
                <Card>
                  <CardContent className="flex flex-col gap-4 p-4">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">QR code</span>
                      <span className="font-medium">{summary.event.check_in_enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>

                    <div className="flex min-h-72 items-center justify-center rounded-xl border bg-background p-4">
                      {qrDataUrl ? (
                        <div className="relative aspect-square w-full max-w-72 overflow-hidden rounded-lg">
                          <Image
                            src={qrDataUrl}
                            alt="Check-in QR code"
                            fill
                            sizes="(min-width: 1024px) 18rem, 100vw"
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">QR code not available yet.</p>
                      )}
                    </div>

                    {checkInUrl && (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={copyLink}>
                          {copyState === 'copied' ? 'Copied' : 'Copy link'}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={checkInUrl} target="_blank" rel="noreferrer">
                            Open link
                          </a>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {canManage && (
                  <Card>
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div>
                        <p className="text-sm font-medium">Manual check-in</p>
                        <p className="text-xs text-muted-foreground">Search a member and check them in directly.</p>
                      </div>
                      <Input
                        value={memberQuery}
                        onChange={(event) => setMemberQuery(event.target.value)}
                        placeholder="Search member name or email"
                      />
                      <div className="max-h-64 overflow-y-auto rounded-lg border">
                        {memberSearchLoading ? (
                          <p className="p-3 text-sm text-muted-foreground">Searching...</p>
                        ) : memberResults.length === 0 ? (
                          <p className="p-3 text-sm text-muted-foreground">Type at least 2 characters to search.</p>
                        ) : (
                          <ul className="divide-y">
                            {memberResults.map((member) => {
                              const pictureUrl = getPictureUrl(member.Picture)
                              return (
                                <li key={member.id} className="flex items-center gap-3 p-3">
                                  <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                                    {pictureUrl ? (
                                      <Image src={pictureUrl} alt="" fill sizes="36px" className="object-cover" unoptimized />
                                    ) : (
                                      member.Name[0]?.toUpperCase() ?? '?'
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{member.Name}</p>
                                  </div>
                                  <Button size="sm" variant="outline" disabled={savingMemberId === member.id} onClick={() => void handleCheckInMember(member.id)}>
                                    {savingMemberId === member.id ? 'Checking in...' : 'Check in'}
                                  </Button>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex min-h-0 flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Checked in members</span>
                  <Separator className="flex-1" />
                </div>

                <Card className="min-h-0 flex-1">
                  <CardContent className="p-0">
                    {summary.attendance_members.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">Nobody has checked in yet.</p>
                    ) : (
                      <ul className="divide-y">
                        {summary.attendance_members.map((member) => {
                          const pictureUrl = getPictureUrl(member.members_main?.Picture)
                          return (
                            <li key={member.member_id} className="flex items-center gap-3 p-3">
                              <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                                {pictureUrl ? (
                                  <Image src={pictureUrl} alt="" fill sizes="36px" className="object-cover" unoptimized />
                                ) : (
                                  member.members_main?.Name?.[0]?.toUpperCase() ?? '?'
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{member.members_main?.Name ?? 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{new Date(member.checked_in_at).toLocaleString()}</p>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t bg-muted/30 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

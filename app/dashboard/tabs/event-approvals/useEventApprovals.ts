"use client"

import { useCallback, useMemo, useState } from "react"
import useSWR from "swr"
import type { DashboardEvent } from "@/app/components/dashboard/types"

export type PendingRegistration = {
  memberId: number
  memberName: string
  requestedAt: string
}

export type EventApprovalGroup = {
  eventId: string | number
  eventTitle: string
  registrations: PendingRegistration[]
}

type MembersMainRef = { id: number; Name: string } | null

type PendingRegistrationRow = {
  member_id: number
  created_at: string
  members_main: MembersMainRef | MembersMainRef[]
}

const normalizeMember = (value: PendingRegistrationRow["members_main"]) =>
  Array.isArray(value) ? value[0] ?? null : value

const loadPendingRegistrations = async (event: DashboardEvent): Promise<EventApprovalGroup | null> => {
  const response = await fetch(`/api/events/${event.id}/registrations/pending`)
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload?.error || `Could not load pending registrations for ${event.title}.`)
  }

  const rows = (payload ?? []) as PendingRegistrationRow[]
  if (rows.length === 0) return null

  const registrations = rows
    .map((row) => {
      const member = normalizeMember(row.members_main)
      if (!member) return null
      return { memberId: member.id, memberName: member.Name, requestedAt: row.created_at }
    })
    .filter((row): row is PendingRegistration => row !== null)

  if (registrations.length === 0) return null

  return { eventId: event.id, eventTitle: event.title, registrations }
}

const isApprovalGatedEvent = (event: DashboardEvent) => event.event_kind === "internal" && event.to_be_approved

const loadQueue = async (events: DashboardEvent[]) => {
  const gatedEvents = events.filter(isApprovalGatedEvent)
  const groups = await Promise.all(gatedEvents.map(loadPendingRegistrations))
  return groups.filter((group): group is EventApprovalGroup => group !== null)
}

export function useEventApprovals(events: DashboardEvent[]) {
  const [error, setError] = useState<string | null>(null)
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)

  // Only re-fetch the queue when the set of approval-gated events actually
  // changes, not on every unrelated events-list update.
  const gatedEventIds = useMemo(
    () => events.filter(isApprovalGatedEvent).map((event) => event.id).join(","),
    [events]
  )

  const {
    data: groups = [],
    error: loadingError,
    isLoading,
    mutate: revalidateQueue,
  } = useSWR(["event-approvals-queue", gatedEventIds], () => loadQueue(events), {
    refreshInterval: 15000,
    revalidateOnFocus: true,
    onSuccess() {
      setError(null)
    },
    onError(err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load pending registrations.")
    },
  })

  const displayError = error ?? (loadingError instanceof Error ? loadingError.message : null)
  const loading = isLoading && groups.length === 0

  const review = useCallback(
    async (eventId: string | number, memberId: number, status: "approved" | "rejected") => {
      const key = `${eventId}:${memberId}`
      setUpdatingKey(key)
      setError(null)

      try {
        const response = await fetch(`/api/events/${eventId}/registrations/${memberId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error || "Could not update the registration.")
        }

        await revalidateQueue()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update the registration.")
      } finally {
        setUpdatingKey(null)
      }
    },
    [revalidateQueue]
  )

  const handleApprove = useCallback(
    (eventId: string | number, memberId: number) => review(eventId, memberId, "approved"),
    [review]
  )

  const handleReject = useCallback(
    (eventId: string | number, memberId: number) => review(eventId, memberId, "rejected"),
    [review]
  )

  const totalPending = useMemo(
    () => groups.reduce((sum, group) => sum + group.registrations.length, 0),
    [groups]
  )

  return {
    error: displayError,
    eventsAwaitingReview: groups.length,
    groups,
    handleApprove,
    handleReject,
    loading,
    totalPending,
    updatingKey,
  }
}

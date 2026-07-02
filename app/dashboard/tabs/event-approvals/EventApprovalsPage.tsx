"use client"

import { CalendarCheckIcon, CheckIcon, ClockIcon, XIcon } from "lucide-react"
import type { DashboardEvent } from "@/app/components/dashboard/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useEventApprovals } from "./useEventApprovals"

const formatRequestedAt = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))

export function EventApprovalsPage({ events }: { events: DashboardEvent[] }) {
  const {
    error,
    eventsAwaitingReview,
    groups,
    handleApprove,
    handleReject,
    loading,
    totalPending,
    updatingKey,
  } = useEventApprovals(events)

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10">
            <CalendarCheckIcon className="h-4.5 w-4.5 text-cyan-300" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-white">Event Approval Queue</h2>
        </div>
        <p className="ml-12 text-sm text-white/55">
          Review pending registrations for events that require board approval to attend.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: "Pending Requests", value: totalPending },
          { label: "Events Awaiting Review", value: eventsAwaitingReview },
        ].map((stat) => (
          <Card key={stat.label} className="border-white/10 bg-white/[0.03] py-0">
            <CardContent className="px-5 py-4">
              <p className="mb-1 text-xs uppercase tracking-[0.18em] text-white/45">{stat.label}</p>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6 border-rose-500/30 bg-rose-500/10 text-rose-200">
          <AlertDescription className="text-current">{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-2xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Empty className="rounded-2xl border border-white/10 bg-white/[0.03] py-24">
          <EmptyHeader>
            <EmptyMedia>
              <CalendarCheckIcon className="h-6 w-6 text-white/35" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-white">No pending requests</EmptyTitle>
            <EmptyDescription className="text-white/50">
              Nothing is waiting for review right now.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <Card key={group.eventId} className="border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">{group.eventTitle}</CardTitle>
                <p className="text-xs text-white/45">
                  {group.registrations.length} pending {group.registrations.length === 1 ? "request" : "requests"}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {group.registrations.map((registration) => {
                  const key = `${group.eventId}:${registration.memberId}`
                  const isUpdating = updatingKey === key

                  return (
                    <div
                      key={key}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{registration.memberName}</p>
                        <p className="flex items-center gap-1 text-xs text-white/45">
                          <ClockIcon className="h-3 w-3" aria-hidden="true" />
                          Requested {formatRequestedAt(registration.requestedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={isUpdating}
                          onClick={() => handleApprove(group.eventId, registration.memberId)}
                          className="bg-emerald-500 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:bg-emerald-500/60"
                        >
                          <CheckIcon data-icon="inline-start" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUpdating}
                          onClick={() => handleReject(group.eventId, registration.memberId)}
                          className="border-rose-400/40 text-xs font-semibold text-rose-200 hover:bg-rose-500/10 disabled:border-rose-400/20 disabled:text-rose-200/60"
                        >
                          <XIcon data-icon="inline-start" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}

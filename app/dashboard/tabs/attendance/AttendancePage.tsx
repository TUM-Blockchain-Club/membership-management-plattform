'use client'

import { useCallback, useMemo, useState } from 'react'
import type { DashboardMember } from '@/app/components/dashboard/types'
import { AttendanceCalendar } from './AttendanceCalendar'
import { LectureEditor } from './LectureEditor'
import { LectureQrDisplay } from './LectureQrDisplay'
import {
  formatDateTime,
  useEventAttendance,
  useLectureMutations,
  useLectures,
  useMemberAttendance,
  useMyAttendance,
  type LectureRow,
  type LectureUpsertPayload,
} from './useAttendance'

type Props = {
  isBoard: boolean
  allMembers: DashboardMember[]
}

export function AttendancePage({ isBoard, allMembers }: Props) {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <h2 className="text-2xl sm:text-3xl font-bold text-white">Attendance</h2>
        <p className="text-white/60 text-sm sm:text-base mt-1">
          {isBoard
            ? 'Manage the lecture schedule, run live check-in QR codes, and review attendance.'
            : 'Your lecture attendance — scan the QR at each meeting to check in.'}
        </p>
      </header>

      <MyCalendarSection />

      {isBoard && (
        <>
          <hr className="border-white/10" />
          <BoardSection allMembers={allMembers} />
        </>
      )}
    </div>
  )
}

function MyCalendarSection() {
  const { data, error, loading } = useMyAttendance()
  const attendance = data?.attendance ?? []

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-white font-semibold text-lg">My calendar</h3>
        <div className="text-white/50 text-xs sm:text-sm">
          {data ? `${attendance.length} of ${data.totalLectures} lectures attended` : ''}
        </div>
      </div>

      {loading && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-white/50 text-sm">
          Loading...
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm p-3">
          {error}
        </div>
      )}
      {!loading && !error && (
        <AttendanceCalendar
          attendance={attendance}
          emptyMessage="No check-ins yet. Scan a lecture QR to start filling your calendar."
        />
      )}
    </section>
  )
}

function BoardSection({ allMembers }: { allMembers: DashboardMember[] }) {
  const { data: lecturesData, refresh: refreshLectures } = useLectures(true)
  const lectures = useMemo(() => lecturesData?.lectures ?? [], [lecturesData])
  const activeLecture = useMemo(
    () => lectures.find((l) => l.is_active) ?? null,
    [lectures]
  )

  const {
    create,
    update,
    remove,
    start,
    stop,
    rotate,
    working,
    mutationError,
  } = useLectureMutations()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<LectureRow | null>(null)
  const [activeToken, setActiveToken] = useState<string | null>(null)
  const [pendingStartId, setPendingStartId] = useState<string | null>(null)

  const handleCreate = () => {
    setEditing(null)
    setEditorOpen(true)
  }
  const handleEdit = (lecture: LectureRow) => {
    setEditing(lecture)
    setEditorOpen(true)
  }

  const handleSubmitEditor = useCallback(
    async (payload: LectureUpsertPayload): Promise<boolean> => {
      const result = editing
        ? await update(editing.id, payload)
        : await create(payload)
      if (result) {
        await refreshLectures()
        return true
      }
      return false
    },
    [create, editing, refreshLectures, update]
  )

  const handleDelete = async (lecture: LectureRow) => {
    if (!confirm(`Delete "${lecture.title}"? This also removes all of its attendance records.`)) {
      return
    }
    const result = await remove(lecture.id)
    if (result) await refreshLectures()
  }

  const handleStart = async (lecture: LectureRow) => {
    setPendingStartId(lecture.id)
    const result = await start(lecture.id)
    setPendingStartId(null)
    if (result) {
      setActiveToken(result.token)
      await refreshLectures()
    }
  }

  const handleStop = async () => {
    if (!activeLecture) return
    const result = await stop(activeLecture.id)
    if (result) {
      setActiveToken(null)
      await refreshLectures()
    }
  }

  const handleRotate = useCallback(
    async (id: string) => {
      const result = await rotate(id)
      return result ?? null
    },
    [rotate]
  )

  return (
    <section className="space-y-6">
      {activeLecture && (
        <ActiveLectureBlock
          lecture={activeLecture}
          token={activeToken}
          onRotate={handleRotate}
          onStop={handleStop}
          stopping={working}
        />
      )}

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden">
        <div className="border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-white">Lecture schedule</h3>
            <p className="text-white/50 text-xs sm:text-sm">
              Core lectures bi-weekly, side meetings weekly.
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={working}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm rounded-lg"
          >
            + New lecture
          </button>
        </div>

        {mutationError && (
          <div className="mx-4 my-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm p-2">
            {mutationError}
          </div>
        )}

        {lectures.length === 0 ? (
          <div className="px-4 py-8 text-center text-white/50 text-sm">
            No lectures yet. Click <strong>+ New lecture</strong> to add one.
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {lectures.map((lecture) => (
              <LectureRowItem
                key={lecture.id}
                lecture={lecture}
                onStart={() => handleStart(lecture)}
                onEdit={() => handleEdit(lecture)}
                onDelete={() => handleDelete(lecture)}
                starting={pendingStartId === lecture.id}
                disableStart={Boolean(activeLecture) && activeLecture?.id !== lecture.id}
                working={working}
              />
            ))}
          </div>
        )}
      </div>

      <MemberCalendarPicker allMembers={allMembers} />

      <LectureEditor
        open={editorOpen}
        initial={editing}
        onCancel={() => setEditorOpen(false)}
        onSubmit={handleSubmitEditor}
        working={working}
        error={mutationError}
      />
    </section>
  )
}

function ActiveLectureBlock({
  lecture,
  token,
  onRotate,
  onStop,
  stopping,
}: {
  lecture: LectureRow
  token: string | null
  onRotate: (id: string) => Promise<{ token: string } | null>
  onStop: () => void
  stopping?: boolean
}) {
  const {
    data: overview,
    loading: overviewLoading,
    refresh: refreshOverview,
  } = useEventAttendance(lecture.id)

  return (
    <div className="bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-blue-500/10 border border-blue-400/30 backdrop-blur-md rounded-xl sm:rounded-2xl overflow-hidden">
      <div className="border-b border-white/10 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wider text-blue-300">
            Live · {lecture.kind === 'core' ? 'Core lecture' : 'Side meeting'}
          </div>
          <h3 className="text-white text-lg font-semibold mt-1">{lecture.title}</h3>
          {lecture.location && (
            <p className="text-white/50 text-xs">{lecture.location}</p>
          )}
        </div>
        <div className="text-white/40 text-xs">
          Started {formatDateTime(lecture.started_at)}
        </div>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4">
        <LectureQrDisplay
          lectureId={lecture.id}
          initialToken={token}
          onRotate={onRotate}
          onStop={onStop}
          stopping={stopping}
        />

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white text-sm font-semibold">
              Attendees ({overview?.attendance.length ?? 0})
            </h4>
            <button
              onClick={() => refreshOverview()}
              className="text-xs text-blue-300 hover:text-blue-200"
            >
              Refresh
            </button>
          </div>

          {overviewLoading && (
            <div className="text-white/50 text-sm">Loading...</div>
          )}

          {!overviewLoading && (!overview || overview.attendance.length === 0) && (
            <div className="text-white/50 text-sm">
              No one has checked in yet. Members will appear here in real time.
            </div>
          )}

          {!overviewLoading && overview && overview.attendance.length > 0 && (
            <div className="divide-y divide-white/10 max-h-96 overflow-y-auto">
              {overview.attendance.map((row) => (
                <div
                  key={row.id}
                  className="py-2 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-white text-sm truncate">
                      {row.member?.name ?? 'Unknown member'}
                    </div>
                    <div className="text-white/40 text-xs truncate">
                      {row.member?.department ?? ''}
                    </div>
                  </div>
                  <div className="text-xs text-emerald-300 whitespace-nowrap">
                    {formatDateTime(row.checked_in_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LectureRowItem({
  lecture,
  onStart,
  onEdit,
  onDelete,
  starting,
  disableStart,
  working,
}: {
  lecture: LectureRow
  onStart: () => void
  onEdit: () => void
  onDelete: () => void
  starting?: boolean
  disableStart?: boolean
  working?: boolean
}) {
  return (
    <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
              lecture.kind === 'core'
                ? 'bg-blue-500/20 border-blue-400/40 text-blue-200'
                : 'bg-purple-500/20 border-purple-400/40 text-purple-200'
            }`}
          >
            {lecture.kind === 'core' ? 'Core' : 'Side'}
          </span>
          <span className="text-white font-medium truncate">{lecture.title}</span>
          {lecture.is_active && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-200">
              Live
            </span>
          )}
        </div>
        <div className="text-white/50 text-xs mt-0.5">
          {formatDateTime(lecture.scheduled_at)}
          {lecture.location ? ` · ${lecture.location}` : ''}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onStart}
          disabled={starting || disableStart}
          title={disableStart ? 'Stop the active lecture first' : ''}
          className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 disabled:bg-emerald-600/30 disabled:cursor-not-allowed text-white text-xs rounded-lg"
        >
          {starting ? 'Starting...' : lecture.is_active ? 'Resume' : 'Start'}
        </button>
        <button
          onClick={onEdit}
          disabled={working}
          className="px-2 py-1.5 border border-white/20 text-white/80 hover:text-white hover:border-white/40 text-xs rounded-lg"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={working}
          className="px-2 py-1.5 border border-red-500/30 text-red-300 hover:text-red-200 hover:border-red-500/50 text-xs rounded-lg"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function MemberCalendarPicker({ allMembers }: { allMembers: DashboardMember[] }) {
  const [memberId, setMemberId] = useState<number | null>(null)
  const { data, loading, error } = useMemberAttendance(memberId)

  const sortedMembers = useMemo(
    () =>
      [...allMembers].sort((a, b) =>
        (a.Name ?? '').localeCompare(b.Name ?? '')
      ),
    [allMembers]
  )

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden">
      <div className="border-b border-white/10 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">View a member&apos;s calendar</h3>
          <p className="text-white/50 text-xs sm:text-sm">
            Pick a member to see their attendance week-by-week.
          </p>
        </div>
        <select
          value={memberId ?? ''}
          onChange={(e) =>
            setMemberId(e.target.value ? Number(e.target.value) : null)
          }
          className="w-full sm:w-72 appearance-none cursor-pointer pl-3 pr-10 py-2.5 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-colors bg-no-repeat"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='rgba(255,255,255,0.6)'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5'/%3e%3c/svg%3e\")",
            backgroundPosition: 'right 0.75rem center',
            backgroundSize: '1rem',
          }}
        >
          <option value="" className="bg-gray-900">— Choose a member —</option>
          {sortedMembers.map((m) => (
            <option key={m.id} value={m.id} className="bg-gray-900">
              {m.Name ?? `Member #${m.id}`}
            </option>
          ))}
        </select>
      </div>

      <div className="p-4 sm:p-6 space-y-3">
        {!memberId && (
          <div className="text-white/50 text-sm text-center py-6">
            Select a member above to load their calendar.
          </div>
        )}
        {memberId && loading && (
          <div className="text-white/50 text-sm">Loading...</div>
        )}
        {memberId && error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm p-3">
            {error}
          </div>
        )}
        {memberId && !loading && data && (
          <>
            <div className="text-white/70 text-sm">
              <span className="font-medium text-white">{data.member.name ?? 'Member'}</span>
              {data.member.department ? ` · ${data.member.department}` : ''}
              {' · '}
              {data.attendance.length} lecture
              {data.attendance.length === 1 ? '' : 's'} attended
            </div>
            <AttendanceCalendar
              attendance={data.attendance}
              emptyMessage="This member has no check-ins yet."
            />
          </>
        )}
      </div>
    </div>
  )
}

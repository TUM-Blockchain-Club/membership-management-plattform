'use client'

import { useState } from 'react'
import { DateTimePicker } from '@/components/date-picker'
import type { LectureKind, LectureRow, LectureUpsertPayload } from './useAttendance'

type Props = {
  open: boolean
  initial: LectureRow | null
  onCancel: () => void
  onSubmit: (payload: LectureUpsertPayload) => Promise<boolean>
  working: boolean
  error: string | null
}

const toLocalInputValue = (iso: string | null): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function LectureEditor({ open, initial, onCancel, onSubmit, working, error }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [kind, setKind] = useState<LectureKind>((initial?.kind as LectureKind) ?? 'side')
  const [scheduledAt, setScheduledAt] = useState(toLocalInputValue(initial?.scheduled_at ?? null))
  const [location, setLocation] = useState(initial?.location ?? '')

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !scheduledAt) return
    const success = await onSubmit({
      title: title.trim(),
      kind,
      scheduled_at: new Date(scheduledAt).toISOString(),
      location: location.trim() || null,
    })
    if (success) onCancel()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-black/90 shadow-2xl">
        <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <h3 className="text-white text-lg font-semibold">
            {initial ? 'Edit lecture' : 'New lecture'}
          </h3>
          <button
            onClick={onCancel}
            className="rounded-lg border border-white/20 px-2.5 py-1 text-xs text-white/70 hover:text-white hover:border-white/40"
          >
            Close
          </button>
        </div>

        <form className="p-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-white/70 text-xs uppercase tracking-wider mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="e.g. Intro to Smart Contracts"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs uppercase tracking-wider mb-1.5">
              Type
            </label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as LectureKind)}
              className="w-full appearance-none cursor-pointer pl-3 pr-10 py-2 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-colors bg-no-repeat"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='rgba(255,255,255,0.6)'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5'/%3e%3c/svg%3e\")",
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1rem',
              }}
            >
              <option value="core" className="bg-gray-900">Core lecture (bi-weekly)</option>
              <option value="side" className="bg-gray-900">Side meeting (weekly)</option>
            </select>
          </div>

          <div>
            <label className="block text-white/70 text-xs uppercase tracking-wider mb-1.5">
              Scheduled at
            </label>
            <DateTimePicker
              id="lecture-scheduled-at"
              value={scheduledAt}
              onChange={setScheduledAt}
              placeholder="Pick date"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs uppercase tracking-wider mb-1.5">
              Location <span className="text-white/40 normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="e.g. MI 00.08.038"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs p-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={working}
              className="flex-1 px-3 py-2 border border-white/20 text-white/80 hover:text-white hover:border-white/40 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={working}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg text-sm"
            >
              {working ? 'Saving...' : initial ? 'Save changes' : 'Create lecture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

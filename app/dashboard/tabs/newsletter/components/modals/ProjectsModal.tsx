'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { NewsletterProject } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  projects: NewsletterProject[]
  currentProjectId: string | null
  onLoad: (project: NewsletterProject) => void
  onDelete: (id: string) => void
  onNew: () => void
}

export function ProjectsModal({ open, onClose, projects, currentProjectId, onLoad, onDelete, onNew }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#15151f] border-[#2a2a3e] text-[#e2e2ee] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#e2e2ee]">📁 Projects</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-[#8080a0]">
            {projects.length} campaign{projects.length !== 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            onClick={onNew}
            className="bg-[#7c6af7] text-white hover:bg-[#6a58e5] text-xs h-7"
          >
            + New Campaign
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-5 text-[12px] text-[#8080a0]">
            No campaigns yet.<br />Click &quot;+ New Campaign&quot;.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => { onLoad(p); onClose() }}
                className={`flex items-center justify-between px-3 py-2.5 rounded border cursor-pointer transition-all gap-2.5 ${
                  p.id === currentProjectId
                    ? 'border-[#7c6af7] bg-[#232333]'
                    : 'border-[#2a2a3e] bg-[#1c1c28] hover:border-[#7c6af7]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[12px] truncate">{p.name || 'Untitled'}</div>
                  <div className="text-[10px] text-[#8080a0] mt-0.5 truncate">
                    {p.subject || '(no subject)'} ·{' '}
                    {new Date(p.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm(`Delete "${p.name || 'Untitled'}"?`)) onDelete(p.id)
                  }}
                  className="text-[11px] px-2 py-1 rounded border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 shrink-0"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

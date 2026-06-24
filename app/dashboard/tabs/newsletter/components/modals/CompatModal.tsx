'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { CompatIssue } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  issues: CompatIssue[]
}

const levelBorder: Record<CompatIssue['level'], string> = {
  high: 'border-l-red-400',
  medium: 'border-l-yellow-400',
  low: 'border-l-white/30',
}

export function CompatModal({ open, onClose, issues }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#15151f] border-[#2a2a3e] text-[#e2e2ee] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#e2e2ee]">🔍 Compatibility Check</DialogTitle>
        </DialogHeader>

        {issues.length === 0 ? (
          <div className="text-center py-5 text-green-400">✅ All good — no compatibility issues.</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className={`flex gap-2.5 px-3 py-2.5 rounded bg-[#1c1c28] border-l-4 ${levelBorder[issue.level]}`}
              >
                <span className="text-[15px] shrink-0 mt-0.5">{issue.icon}</span>
                <div>
                  <div className="text-[11px] font-semibold mb-0.5">{issue.title}</div>
                  <div className="text-[10px] text-[#8080a0] leading-[1.4]">{issue.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

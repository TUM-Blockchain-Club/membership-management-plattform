'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TEMPLATES } from '../templates'

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (html: string, label: string) => void
}

export function TemplatesModal({ open, onClose, onSelect }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#15151f] border-[#2a2a3e] text-[#e2e2ee] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#e2e2ee]">📋 Choose Template</DialogTitle>
        </DialogHeader>
        <p className="text-[11px] text-[#8080a0] -mt-1 mb-2">
          Selecting a template will replace existing content.
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.html, t.label)}
              className="border-2 border-[#2a2a3e] rounded-lg overflow-hidden cursor-pointer transition-all hover:border-[#7c6af7] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#7c6af7]/20 bg-[#1c1c28] text-left"
            >
              <div className="h-[100px] flex items-center justify-center bg-[#232333] text-4xl">
                {t.icon}
              </div>
              <div className="p-2.5">
                <strong className="block text-[12px] mb-0.5">{t.label}</strong>
                <span className="text-[10px] text-[#8080a0]">{t.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

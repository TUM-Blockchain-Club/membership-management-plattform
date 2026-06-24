'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'


type Props = {
  open: boolean
  onClose: () => void
  html: string
  mode: 'light' | 'dark'
  onModeChange: (m: 'light' | 'dark') => void
  width: 'desktop' | 'mobile'
  onWidthChange: (w: 'desktop' | 'mobile') => void
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex bg-[#0d0d14] rounded border border-[#2a2a3e] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 text-[11px] rounded transition-all ${
            value === o.value ? 'bg-[#7c6af7] text-white' : 'text-[#8080a0] hover:text-[#e2e2ee]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function PreviewModal({ open, onClose, html, mode, onModeChange, width, onWidthChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="bg-[#15151f] border-[#2a2a3e] !max-w-none w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">Email Preview</DialogTitle>
        {/* Bar */}
        <div className="flex items-center gap-3.5 px-4 py-2.5 bg-[#1c1c28] border-b border-[#2a2a3e] shrink-0">
          <strong className="text-[13px] text-[#e2e2ee]">👁 Preview</strong>
          <ToggleGroup
            options={[
              { value: 'light', label: '☀️ Light' },
              { value: 'dark', label: '🌙 Dark' },
            ]}
            value={mode}
            onChange={onModeChange}
          />
          <ToggleGroup
            options={[
              { value: 'desktop', label: '🖥 Desktop' },
              { value: 'mobile', label: '📱 Mobile' },
            ]}
            value={width}
            onChange={onWidthChange}
          />
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="text-[11px] px-2.5 py-1 rounded border border-[#2a2a3e] bg-[#1c1c28] text-[#e2e2ee] hover:border-[#7c6af7]"
          >
            ✕ Close
          </button>
        </div>

        {/* Stage */}
        <div
          className={`flex-1 overflow-auto flex justify-center items-start p-6 transition-colors ${
            mode === 'light' ? 'bg-[#e9e9f2]' : 'bg-[#0b0b10]'
          }`}
        >
          <iframe
            title="Email Preview"
            srcDoc={html}
            style={{
              border: 'none',
              background: 'transparent',
              width: width === 'mobile' ? '375px' : '600px',
              maxWidth: '100%',
              minHeight: '600px',
              height: '100%',
              borderRadius: '8px',
              boxShadow: '0 8px 40px rgba(0,0,0,.25)',
              transition: 'width 0.2s',
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

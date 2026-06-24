'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Props = {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  const domain = 'newsletter.tum-blockchain.com'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#15151f] border-[#2a2a3e] text-[#e2e2ee] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#e2e2ee]">⚙️ Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="pb-4 border-b border-[#2a2a3e]">
            <h3 className="text-[10px] uppercase tracking-wide text-[#8080a0] font-semibold mb-3">Mailgun</h3>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#8080a0]">API Key</span>
                <span className="text-[#e2e2ee]">••••••••• (server-side)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8080a0]">Domain</span>
                <span className="text-[#e2e2ee]">{domain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8080a0]">Region</span>
                <span className="text-[#e2e2ee]">EU (api.eu.mailgun.net)</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wide text-[#8080a0] font-semibold mb-2">Assets</h3>
            <p className="text-[11px] text-[#8080a0]">
              Images are stored in the Supabase <code className="text-[#7c6af7]">newsletter-assets</code> bucket (public).
            </p>
          </div>

          <p className="text-[10px] text-[#4a4a60]">
            Mailgun credentials are configured server-side via environment variables.
            Contact the system administrator to update them.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

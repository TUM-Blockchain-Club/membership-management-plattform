'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { MailingList } from '../types'
import type { SendStep } from '../../useNewsletter'

type Props = {
  open: boolean
  onClose: () => void
  campaignName: string
  subject: string
  fromName: string
  onFromNameChange: (v: string) => void
  fromEmail: string
  onFromEmailChange: (v: string) => void
  toAddress: string
  onToAddressChange: (v: string) => void
  testEmail: string
  onTestEmailChange: (v: string) => void
  sendStep: SendStep
  sending: boolean
  mailingLists: MailingList[]
  loadingLists: boolean
  onLoadLists: () => void
  onSendTest: () => Promise<boolean>
  onSendToList: () => Promise<boolean>
}

export function SendModal({
  open,
  onClose,
  campaignName,
  subject,
  fromName,
  onFromNameChange,
  fromEmail,
  onFromEmailChange,
  toAddress,
  onToAddressChange,
  testEmail,
  onTestEmailChange,
  sendStep,
  sending,
  mailingLists,
  loadingLists,
  onLoadLists,
  onSendTest,
  onSendToList,
}: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const testDone = sendStep === 'test-sent' || sendStep === 'confirmed'
  const canSendToList = testDone && confirmed

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#15151f] border-[#2a2a3e] text-[#e2e2ee] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#e2e2ee]">🚀 Send Email</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="bg-[#1c1c28] rounded p-3 space-y-1 text-[11px]">
          <div className="flex gap-2"><span className="text-[#8080a0] w-16">Campaign:</span><strong>{campaignName || '(untitled)'}</strong></div>
          <div className="flex gap-2"><span className="text-[#8080a0] w-16">Subject:</span><strong>{subject || '(no subject)'}</strong></div>
        </div>

        {/* From */}
        <div>
          <div className="text-[10px] text-[#8080a0] uppercase tracking-wide font-semibold mb-1.5">From</div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[#1c1c28] border border-[#2a2a3e] rounded text-[#e2e2ee] text-[12px] px-2.5 py-1.5 outline-none focus:border-[#7c6af7]"
              placeholder="Sender Name"
              value={fromName}
              onChange={(e) => onFromNameChange(e.target.value)}
            />
            <input
              className="flex-[1.4] bg-[#1c1c28] border border-[#2a2a3e] rounded text-[#e2e2ee] text-[12px] px-2.5 py-1.5 outline-none focus:border-[#7c6af7]"
              placeholder="email@domain.com"
              value={fromEmail}
              onChange={(e) => onFromEmailChange(e.target.value)}
            />
          </div>
        </div>

        {/* To */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] text-[#8080a0] uppercase tracking-wide font-semibold">To (Mailing List)</div>
            <button
              onClick={onLoadLists}
              disabled={loadingLists}
              className="text-[10px] px-2 py-1 rounded border border-[#2a2a3e] bg-[#1c1c28] text-[#e2e2ee] hover:border-[#7c6af7] disabled:opacity-50"
            >
              {loadingLists ? '…' : '↻ Load Mailgun Lists'}
            </button>
          </div>
          <input
            className="w-full bg-[#1c1c28] border border-[#2a2a3e] rounded text-[#e2e2ee] text-[12px] px-2.5 py-1.5 outline-none focus:border-[#7c6af7]"
            placeholder="list@tum-blockchain.com"
            value={toAddress}
            onChange={(e) => onToAddressChange(e.target.value)}
          />
          {mailingLists.length > 0 && (
            <div className="bg-[#1c1c28] border border-[#2a2a3e] rounded mt-1.5 max-h-36 overflow-y-auto">
              {mailingLists.map((l) => (
                <div
                  key={l.address}
                  onClick={() => onToAddressChange(l.address)}
                  className="flex items-center justify-between gap-2 px-2.5 py-2 border-b border-[#2a2a3e] last:border-b-0 cursor-pointer hover:bg-[#232333] transition-colors"
                >
                  <div>
                    <div className="text-[11px] font-semibold">{l.address}</div>
                    {l.name && <div className="text-[10px] text-[#8080a0]">{l.name}</div>}
                  </div>
                  <span className="text-[10px] text-[#7c6af7] font-semibold bg-[#7c6af7]/12 px-2 py-0.5 rounded-full shrink-0">
                    {l.membersCount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 1: Test */}
        <div className="border-t border-[#2a2a3e] pt-3.5">
          <div className="flex items-center gap-2 text-[12px] font-semibold mb-2.5">
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${testDone ? 'bg-green-400 text-[#0d0d14]' : 'bg-[#232333] text-[#8080a0]'}`}>
              {testDone ? '✓' : '1'}
            </span>
            Send Test <span className="text-red-400 text-[10px] font-semibold">REQUIRED</span>
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[#1c1c28] border border-[#2a2a3e] rounded text-[#e2e2ee] text-[12px] px-2.5 py-1.5 outline-none focus:border-[#7c6af7]"
              placeholder="test@gmail.com"
              value={testEmail}
              onChange={(e) => onTestEmailChange(e.target.value)}
            />
            <Button
              onClick={onSendTest}
              disabled={sending}
              size="sm"
              className="bg-[#1c1c28] border border-[#2a2a3e] text-[#e2e2ee] hover:bg-[#232333] hover:border-[#7c6af7] text-[12px]"
            >
              {sending ? '…' : 'Send Test'}
            </Button>
          </div>
        </div>

        {/* Step 2: Confirm */}
        <div className={`border-t border-[#2a2a3e] pt-3.5 transition-opacity ${testDone ? '' : 'opacity-50 pointer-events-none'}`}>
          <div className="flex items-center gap-2 text-[12px] font-semibold mb-2.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-[#232333] text-[#8080a0]">2</span>
            Review & Confirm
          </div>
          {!testDone ? (
            <p className="text-[12px] text-[#8080a0]">Send a test first, then confirm here.</p>
          ) : (
            <label className="flex items-start gap-2 cursor-pointer bg-[#7c6af7]/08 border border-[#7c6af7]/25 rounded p-2.5">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 shrink-0 accent-[#7c6af7]"
              />
              <span className="text-[12px] leading-snug">
                I checked the test email in my inbox and it looks correct.
              </span>
            </label>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-1">
          <Button variant="outline" size="sm" onClick={onClose} className="border-[#2a2a3e] text-[#e2e2ee]">
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canSendToList || sending}
            onClick={onSendToList}
            className="bg-[#7c6af7] text-white hover:bg-[#6a58e5] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? '…' : '🚀 Send to List'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

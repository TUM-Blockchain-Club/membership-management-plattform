'use client'

import type { CompatIssue } from './types'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type Props = {
  campaignName: string
  onCampaignNameChange: (v: string) => void
  subject: string
  onSubjectChange: (v: string) => void
  saveStatus: SaveStatus
  compatIssues: CompatIssue[]
  onPreview: () => void
  onTemplates: () => void
  onProjects: () => void
  onSave: () => void
  onSend: () => void
  onSettings: () => void
  onCompatClick: () => void
}

function CompatBadge({ issues, onClick }: { issues: CompatIssue[]; onClick: () => void }) {
  const high = issues.filter((i) => i.level === 'high').length
  const total = issues.length

  let cls = 'text-xs font-semibold px-2.5 py-1 rounded border cursor-pointer transition-colors '
  let label: string

  if (!total) {
    cls += 'bg-green-500/10 text-green-400 border-green-500/25'
    label = '✓ Compatible'
  } else if (high > 0) {
    cls += 'bg-red-500/10 text-red-400 border-red-500/25'
    label = `🚫 ${total} Issue${total > 1 ? 's' : ''}`
  } else {
    cls += 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25'
    label = `⚠️ ${total} Warning${total > 1 ? 's' : ''}`
  }

  return (
    <button className={cls} onClick={onClick}>
      {label}
    </button>
  )
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  const map: Record<SaveStatus, string> = {
    idle: '',
    saving: '…',
    saved: 'Saved ✓',
    error: 'Save failed',
  }
  return (
    <span className={`text-[10px] ${status === 'error' ? 'text-red-400' : 'text-white/40'}`}>
      {map[status]}
    </span>
  )
}

function TbBtn({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-medium px-3 py-1.5 rounded border transition-colors whitespace-nowrap flex items-center gap-1 ${
        primary
          ? 'bg-[#7c6af7] border-[#7c6af7] text-white hover:bg-[#6a58e5]'
          : 'bg-[#1c1c28] border-[#2a2a3e] text-[#e2e2ee] hover:bg-[#232333] hover:border-[#7c6af7]'
      }`}
    >
      {children}
    </button>
  )
}

export function NewsletterTopbar({
  campaignName,
  onCampaignNameChange,
  subject,
  onSubjectChange,
  saveStatus,
  compatIssues,
  onPreview,
  onTemplates,
  onProjects,
  onSave,
  onSend,
  onSettings,
  onCompatClick,
}: Props) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 h-[50px] bg-[#15151f] border-b border-[#2a2a3e] shrink-0 z-10">
      <div className="font-bold text-[13px] text-white whitespace-nowrap flex items-center gap-1.5">
        ✉️ <span className="text-[#7c6af7]">Mail</span>Control
      </div>
      <div className="w-px h-6 bg-[#2a2a3e] shrink-0" />

      <span className="text-[10px] text-[#4a4a60] whitespace-nowrap">Campaign</span>
      <input
        className="bg-[#1c1c28] border border-[#2a2a3e] rounded text-[#e2e2ee] text-xs px-2.5 py-1.5 outline-none w-44 focus:border-[#7c6af7] transition-colors"
        placeholder="Campaign name…"
        value={campaignName}
        onChange={(e) => onCampaignNameChange(e.target.value)}
      />

      <span className="text-[10px] text-[#4a4a60] whitespace-nowrap">Subject</span>
      <input
        className="bg-[#1c1c28] border border-[#2a2a3e] rounded text-[#e2e2ee] text-xs px-2.5 py-1.5 outline-none w-44 focus:border-[#7c6af7] transition-colors"
        placeholder="Email subject…"
        value={subject}
        onChange={(e) => onSubjectChange(e.target.value)}
      />

      <div className="flex-1" />

      <SaveStatusBadge status={saveStatus} />
      <CompatBadge issues={compatIssues} onClick={onCompatClick} />

      <div className="w-px h-6 bg-[#2a2a3e] shrink-0" />

      <TbBtn onClick={onPreview}>👁 Preview</TbBtn>
      <TbBtn onClick={onTemplates}>📋 Templates</TbBtn>
      <TbBtn onClick={onProjects}>📁 Projects</TbBtn>
      <TbBtn onClick={onSave}>💾 Save</TbBtn>
      <TbBtn onClick={onSend} primary>🚀 Send</TbBtn>
      <TbBtn onClick={onSettings}>⚙️</TbBtn>
    </div>
  )
}

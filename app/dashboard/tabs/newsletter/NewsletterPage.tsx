'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useNewsletter } from './useNewsletter'
import { NewsletterTopbar } from './components/NewsletterTopbar'
import { NewsletterLogbar } from './components/NewsletterLogbar'
import { ProjectsModal } from './components/modals/ProjectsModal'
import { TemplatesModal } from './components/modals/TemplatesModal'
import { PreviewModal } from './components/modals/PreviewModal'
import { CompatModal } from './components/modals/CompatModal'
import { SendModal } from './components/modals/SendModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { AssetPickerModal } from './components/modals/AssetPickerModal'
import 'grapesjs/dist/css/grapes.min.css'
import './grapes-dark.css'

const GrapesEditor = dynamic(
  () => import('./components/GrapesEditor').then((m) => m.GrapesEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-[#0d0d14]">
        <div className="text-[#8080a0] text-sm animate-pulse">Loading editor…</div>
      </div>
    ),
  }
)

type Props = {
  effectiveHasSpecialAccess: boolean
}

export function NewsletterPage({ effectiveHasSpecialAccess }: Props) {
  const nl = useNewsletter()

  useEffect(() => {
    if (!effectiveHasSpecialAccess) return
    nl.fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveHasSpecialAccess])

  if (!effectiveHasSpecialAccess) {
    return (
      <div className="flex items-center justify-center h-64 text-[#8080a0]">
        You do not have access to the newsletter editor.
      </div>
    )
  }

  return (
    // Negative margins escape DashboardFrame's px-4/sm:px-6 py-6/sm:py-8/md:py-12 padding
    <div
      className="flex flex-col bg-[#0d0d14] overflow-hidden -mx-4 sm:-mx-6 -mt-6 sm:-mt-8 md:-mt-12 -mb-6 sm:-mb-8 md:-mb-12"
      style={{ height: 'calc(100vh - 130px)' }}
    >
      <NewsletterTopbar
        campaignName={nl.campaignName}
        onCampaignNameChange={(v) => { nl.setCampaignName(v); nl.scheduleSave() }}
        subject={nl.subject}
        onSubjectChange={(v) => { nl.setSubject(v); nl.scheduleSave() }}
        saveStatus={nl.saveStatus}
        compatIssues={nl.compatIssues}
        onPreview={nl.openPreview}
        onTemplates={() => nl.setActiveModal('templates')}
        onProjects={() => { nl.fetchProjects(); nl.setActiveModal('projects') }}
        onSave={() => nl.saveProject()}
        onSend={nl.openSendModal}
        onSettings={() => nl.setActiveModal('settings')}
        onCompatClick={() => { nl.runCheck(); nl.setActiveModal('compat') }}
      />

      <div className="flex-1 min-h-0">
        <GrapesEditor
          ref={nl.editorRef}
          onChange={nl.handleEditorChange}
          onEditorReady={() => {
            nl.runCheck()
            nl.fetchAssets()
          }}
        />
      </div>

      <NewsletterLogbar logs={nl.logs} />

      {/* Modals */}
      <ProjectsModal
        open={nl.activeModal === 'projects'}
        onClose={() => nl.setActiveModal(null)}
        projects={nl.projects}
        currentProjectId={nl.currentProjectId}
        onLoad={nl.loadProject}
        onDelete={nl.deleteProject}
        onNew={nl.newProject}
      />

      <TemplatesModal
        open={nl.activeModal === 'templates'}
        onClose={() => nl.setActiveModal(null)}
        onSelect={nl.loadTemplate}
      />

      <PreviewModal
        open={nl.activeModal === 'preview'}
        onClose={() => nl.setActiveModal(null)}
        html={nl.previewHtml}
        mode={nl.previewMode}
        onModeChange={nl.setPreviewMode}
        width={nl.previewWidth}
        onWidthChange={nl.setPreviewWidth}
      />

      <CompatModal
        open={nl.activeModal === 'compat'}
        onClose={() => nl.setActiveModal(null)}
        issues={nl.compatIssues}
      />

      <SendModal
        open={nl.activeModal === 'send'}
        onClose={() => nl.setActiveModal(null)}
        campaignName={nl.campaignName}
        subject={nl.subject}
        fromName={nl.fromName}
        onFromNameChange={nl.setFromName}
        fromEmail={nl.fromEmail}
        onFromEmailChange={nl.setFromEmail}
        toAddress={nl.toAddress}
        onToAddressChange={nl.setToAddress}
        testEmail={nl.testEmail}
        onTestEmailChange={nl.setTestEmail}
        sendStep={nl.sendStep}
        sending={nl.sending}
        mailingLists={nl.mailingLists}
        loadingLists={nl.loadingLists}
        onLoadLists={nl.fetchMailingLists}
        onSendTest={nl.sendTest}
        onSendToList={nl.sendToList}
      />

      <SettingsModal
        open={nl.activeModal === 'settings'}
        onClose={() => nl.setActiveModal(null)}
      />

      <AssetPickerModal
        open={nl.activeModal === 'assets'}
        onClose={() => nl.setActiveModal(null)}
        assets={nl.assets}
        uploadingAsset={nl.uploadingAsset}
        onUpload={nl.uploadAsset}
        onSelect={(asset) => {
          // Copy src to clipboard — user can paste into GrapeJS image field
          navigator.clipboard.writeText(asset.src)
            .then(() => nl.addLog('info', `Copied URL: ${asset.name}`))
            .catch(() => nl.addLog('error', 'Failed to copy URL to clipboard'))
        }}
      />
    </div>
  )
}

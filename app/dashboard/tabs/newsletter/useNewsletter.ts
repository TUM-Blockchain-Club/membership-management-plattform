'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import type { GrapesEditorHandle } from './components/GrapesEditor'
import type { NewsletterProject, CompatIssue, LogEntry, Asset, MailingList, DeliveryEvent } from './components/types'
import { runCompatCheck } from './components/compat-checks'

export type SendStep = 'idle' | 'test-sent' | 'confirmed'

export function useNewsletter() {
  const editorRef = useRef<GrapesEditorHandle>(null)

  // Project state
  const [projects, setProjects] = useState<NewsletterProject[]>([])
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [campaignName, setCampaignName] = useState('')
  const [subject, setSubject] = useState('')
  const [fromName, setFromName] = useState('')
  const [fromEmail, setFromEmail] = useState(`newsletter@newsletter.tum-blockchain.com`)
  const [toAddress, setToAddress] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Compat
  const [compatIssues, setCompatIssues] = useState<CompatIssue[]>([])

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([])

  // Sending
  const [sending, setSending] = useState(false)
  const [sendStep, setSendStep] = useState<SendStep>('idle')
  const [lastMessageId, setLastMessageId] = useState<string | null>(null)
  const [deliveryEvents, setDeliveryEvents] = useState<DeliveryEvent[]>([])

  // Mailing lists
  const [mailingLists, setMailingLists] = useState<MailingList[]>([])
  const [loadingLists, setLoadingLists] = useState(false)

  // Assets
  const [assets, setAssets] = useState<Asset[]>([])
  const [uploadingAsset, setUploadingAsset] = useState(false)

  // Modals
  type ModalName = 'projects' | 'templates' | 'preview' | 'compat' | 'send' | 'settings' | 'assets' | null
  const [activeModal, setActiveModal] = useState<ModalName>(null)

  // Preview state
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light')
  const [previewWidth, setPreviewWidth] = useState<'desktop' | 'mobile'>('desktop')

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs((prev) => [
      { id: `${Date.now()}-${Math.random()}`, type, message, timestamp: Date.now() },
      ...prev.slice(0, 19),
    ])
  }, [])

  const runCheck = useCallback(() => {
    if (!editorRef.current) return
    const html = editorRef.current.getHtml() + '<style>' + editorRef.current.getCss() + '</style>'
    const issues = runCompatCheck(html)
    setCompatIssues(issues)
  }, [])

  const scheduleCheck = useCallback(() => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current)
    checkTimerRef.current = setTimeout(runCheck, 800)
  }, [runCheck])

  const getEmailHtml = useCallback(async (): Promise<string> => {
    if (!editorRef.current) return ''
    const html = editorRef.current.getHtml()
    const css = editorRef.current.getCss()
    if (!css?.trim()) return html
    try {
      const r = await fetch('/api/newsletter/inline-css', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, css }),
      })
      const d = await r.json() as { html?: string }
      return d.html ?? html
    } catch {
      return html
    }
  }, [])

  const fetchProjects = useCallback(async () => {
    try {
      const r = await fetch('/api/newsletter/projects')
      const d = await r.json() as { projects?: NewsletterProject[]; error?: string }
      if (!r.ok) throw new Error(d.error ?? 'Failed to load projects')
      setProjects(d.projects ?? [])
      return d.projects ?? []
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load projects'
      addLog('error', msg)
      return []
    }
  }, [addLog])

  const loadProject = useCallback((project: NewsletterProject) => {
    setCurrentProjectId(project.id)
    setCampaignName(project.name)
    setSubject(project.subject ?? '')
    if (!editorRef.current) return
    if (project.gjs_data) {
      try {
        editorRef.current.loadProjectData(project.gjs_data)
        return
      } catch {}
    }
    if (project.html) {
      editorRef.current.setComponents(project.html)
    }
  }, [])

  const saveProject = useCallback(async (silent = false) => {
    if (!editorRef.current) return
    setSaveStatus('saving')
    try {
      const html = await getEmailHtml()
      const gjsData = editorRef.current.getProjectData()
      const r = await fetch('/api/newsletter/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentProjectId,
          name: campaignName || 'Untitled',
          subject,
          from_name: fromName,
          from_email: fromEmail,
          to_address: toAddress,
          html,
          gjs_data: gjsData,
        }),
      })
      const d = await r.json() as { project?: NewsletterProject; error?: string }
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      if (d.project && !currentProjectId) {
        setCurrentProjectId(d.project.id)
      }
      setSaveStatus('saved')
      if (!silent) addLog('success', 'Project saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
      await fetchProjects()
    } catch (err) {
      setSaveStatus('error')
      const msg = err instanceof Error ? err.message : 'Save failed'
      addLog('error', msg)
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [addLog, campaignName, currentProjectId, fetchProjects, fromEmail, fromName, getEmailHtml, subject, toAddress])

  const saveProjectRef = useRef(saveProject)
  saveProjectRef.current = saveProject

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(() => saveProjectRef.current(true), 2500)
  }, [])

  const handleEditorChange = useCallback(() => {
    scheduleCheck()
    scheduleSave()
  }, [scheduleCheck, scheduleSave])

  const deleteProject = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/newsletter/projects/${id}`, { method: 'DELETE' })
      if (!r.ok) {
        const d = await r.json() as { error?: string }
        throw new Error(d.error ?? 'Delete failed')
      }
      if (currentProjectId === id) {
        setCurrentProjectId(null)
        setCampaignName('')
        setSubject('')
        editorRef.current?.setComponents('')
      }
      await fetchProjects()
      addLog('info', 'Project deleted')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed'
      toast.error(msg)
      addLog('error', msg)
    }
  }, [addLog, currentProjectId, fetchProjects])

  const newProject = useCallback(() => {
    setCurrentProjectId(null)
    setCampaignName('')
    setSubject('')
    editorRef.current?.setComponents('')
    setActiveModal(null)
    toast.info('New campaign — choose a template or start blank.')
  }, [])

  const loadTemplate = useCallback((html: string, label: string) => {
    editorRef.current?.setComponents(html)
    setActiveModal(null)
    toast.success(`Template "${label}" loaded`)
    scheduleCheck()
  }, [scheduleCheck])

  const openPreview = useCallback(async () => {
    const html = await getEmailHtml()
    setPreviewHtml(html)
    setActiveModal('preview')
  }, [getEmailHtml])

  const sendTest = useCallback(async (): Promise<boolean> => {
    if (!testEmail) {
      toast.error('Enter a test email address first')
      return false
    }
    setSending(true)
    try {
      const html = await getEmailHtml()
      const r = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromName, fromEmail, subject, html, testEmail }),
      })
      const d = await r.json() as { ok?: boolean; id?: string; error?: string }
      if (!r.ok) throw new Error(d.error ?? 'Send failed')
      setSendStep('test-sent')
      if (d.id) setLastMessageId(d.id)
      addLog('success', `Test sent to ${testEmail}`)
      toast.success(`Test email sent to ${testEmail}`)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed'
      toast.error(msg)
      addLog('error', msg)
      return false
    } finally {
      setSending(false)
    }
  }, [addLog, fromEmail, fromName, getEmailHtml, subject, testEmail])

  const sendToList = useCallback(async (): Promise<boolean> => {
    if (!toAddress) {
      toast.error('Enter a mailing list address first')
      return false
    }
    setSending(true)
    try {
      const html = await getEmailHtml()
      const r = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromName, fromEmail, toAddress, subject, html }),
      })
      const d = await r.json() as { ok?: boolean; id?: string; error?: string }
      if (!r.ok) throw new Error(d.error ?? 'Send failed')
      if (d.id) setLastMessageId(d.id)
      addLog('success', `Sent to list: ${toAddress}`)
      toast.success(`Campaign sent to ${toAddress}`)
      setSendStep('idle')
      setActiveModal(null)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed'
      toast.error(msg)
      addLog('error', msg)
      return false
    } finally {
      setSending(false)
    }
  }, [addLog, fromEmail, fromName, getEmailHtml, subject, toAddress])

  const checkDelivery = useCallback(async (messageId: string) => {
    try {
      const r = await fetch(`/api/newsletter/delivery-status?messageId=${encodeURIComponent(messageId)}`)
      const d = await r.json() as { items?: DeliveryEvent[]; error?: string }
      if (!r.ok) throw new Error(d.error ?? 'Failed')
      setDeliveryEvents(d.items ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get delivery status'
      addLog('error', msg)
    }
  }, [addLog])

  const fetchMailingLists = useCallback(async () => {
    setLoadingLists(true)
    try {
      const r = await fetch('/api/newsletter/mailing-lists')
      const d = await r.json() as { lists?: MailingList[]; error?: string }
      if (!r.ok) throw new Error(d.error ?? 'Failed')
      setMailingLists(d.lists ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load lists'
      toast.error(msg)
      addLog('error', msg)
    } finally {
      setLoadingLists(false)
    }
  }, [addLog])

  const fetchAssets = useCallback(async () => {
    try {
      const r = await fetch('/api/newsletter/assets')
      const d = await r.json() as { assets?: Asset[]; error?: string }
      if (!r.ok) throw new Error(d.error ?? 'Failed')
      setAssets(d.assets ?? [])
    } catch (err) {
      addLog('error', err instanceof Error ? err.message : 'Failed to load assets')
    }
  }, [addLog])

  const uploadAsset = useCallback(async (file: File): Promise<Asset | null> => {
    setUploadingAsset(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const r = await fetch('/api/newsletter/assets', { method: 'POST', body: form })
      const d = await r.json() as { name?: string; src?: string; error?: string }
      if (!r.ok) throw new Error(d.error ?? 'Upload failed')
      const asset: Asset = { name: d.name ?? file.name, src: d.src ?? '' }
      setAssets((prev) => [asset, ...prev])
      addLog('success', `Uploaded: ${file.name}`)
      return asset
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      toast.error(msg)
      addLog('error', msg)
      return null
    } finally {
      setUploadingAsset(false)
    }
  }, [addLog])

  const openSendModal = useCallback(() => {
    setSendStep('idle')
    setActiveModal('send')
  }, [])


  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current)
    }
  }, [])

  return {
    editorRef,
    // project
    projects, currentProjectId,
    campaignName, setCampaignName,
    subject, setSubject,
    fromName, setFromName,
    fromEmail, setFromEmail,
    toAddress, setToAddress,
    testEmail, setTestEmail,
    saveStatus,
    // compat
    compatIssues,
    // logs
    logs,
    // sending
    sending, sendStep, setSendStep,
    lastMessageId,
    deliveryEvents,
    // mailing lists
    mailingLists, loadingLists,
    // assets
    assets, uploadingAsset,
    // modals
    activeModal, setActiveModal,
    // preview
    previewHtml,
    previewMode, setPreviewMode,
    previewWidth, setPreviewWidth,
    // actions
    addLog,
    runCheck,
    fetchProjects,
    loadProject,
    saveProject,
    deleteProject,
    newProject,
    loadTemplate,
    openPreview,
    sendTest,
    sendToList,
    checkDelivery,
    fetchMailingLists,
    fetchAssets,
    uploadAsset,
    handleEditorChange,
    openSendModal,
    scheduleSave,
  }
}

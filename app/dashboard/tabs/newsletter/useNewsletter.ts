'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import type { RefObject } from 'react'
import type { GrapesEditorHandle } from './components/GrapesEditor'
import type { MailingList, NewsletterProject } from './components/types'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useNewsletter(editorRef: RefObject<GrapesEditorHandle | null>) {
  const [projects, setProjects] = useState<NewsletterProject[]>([])
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [campaignName, setCampaignName] = useState('')
  const [subject, setSubject] = useState('')
  const [fromName, setFromName] = useState('TUM Blockchain Club')
  const [fromEmail, setFromEmail] = useState('newsletter@newsletter.tum-blockchain.com')
  const [toAddress, setToAddress] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [dirty, setDirty] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [sendingCampaign, setSendingCampaign] = useState(false)
  const [testSent, setTestSent] = useState(false)
  const [mailingLists, setMailingLists] = useState<MailingList[]>([])
  const [loadingLists, setLoadingLists] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)

  const getEmailHtml = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return ''

    const html = editor.getHtml()
    const css = editor.getCss()

    if (!css.trim()) return html

    const response = await fetch('/api/newsletter/inline-css', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, css }),
    })
    const data = await response.json() as { html?: string; error?: string }

    if (!response.ok) {
      throw new Error(data.error ?? 'Could not inline CSS.')
    }

    return data.html ?? html
  }, [editorRef])

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const response = await fetch('/api/newsletter/projects')
      const data = await response.json() as { projects?: NewsletterProject[]; error?: string }

      if (!response.ok) {
        throw new Error(data.error ?? 'Could not load newsletter projects.')
      }

      setProjects(data.projects ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load newsletter projects.')
    } finally {
      setLoadingProjects(false)
    }
  }, [])

  const loadProject = useCallback((project: NewsletterProject) => {
    setCurrentProjectId(project.id)
    setCampaignName(project.name)
    setSubject(project.subject ?? '')
    setFromName(project.from_name ?? 'TUM Blockchain Club')
    setFromEmail(project.from_email ?? 'newsletter@newsletter.tum-blockchain.com')
    setToAddress(project.to_address ?? '')

    try {
      if (project.gjs_data) {
        editorRef.current?.loadProjectData(project.gjs_data)
      } else if (project.html) {
        editorRef.current?.setComponents(project.html)
      }
      setDirty(false)
      toast.success(`Loaded "${project.name}"`)
    } catch {
      toast.error('Could not load project into the editor.')
    }
  }, [editorRef])

  const newProject = useCallback(() => {
    setCurrentProjectId(null)
    setCampaignName('')
    setSubject('')
    setToAddress('')
    setTestSent(false)
    setDirty(false)
    editorRef.current?.setComponents('')
  }, [editorRef])

  const loadTemplate = useCallback((html: string, label: string) => {
    editorRef.current?.setComponents(html)
    setDirty(true)
    setTestSent(false)
    toast.success(`Loaded "${label}"`)
  }, [editorRef])

  const saveProject = useCallback(async () => {
    if (!editorRef.current) {
      toast.error('The editor is still loading.')
      return
    }

    setSaveStatus('saving')
    try {
      const html = await getEmailHtml()
      const response = await fetch('/api/newsletter/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentProjectId,
          name: campaignName.trim() || 'Untitled campaign',
          subject,
          from_name: fromName,
          from_email: fromEmail,
          to_address: toAddress,
          html,
          gjs_data: editorRef.current.getProjectData(),
        }),
      })
      const data = await response.json() as { project?: NewsletterProject; error?: string }

      if (!response.ok) {
        throw new Error(data.error ?? 'Could not save newsletter project.')
      }

      if (data.project) {
        setCurrentProjectId(data.project.id)
      }
      setDirty(false)
      setSaveStatus('saved')
      toast.success('Newsletter project saved.')
      await fetchProjects()
    } catch (error) {
      setSaveStatus('error')
      toast.error(error instanceof Error ? error.message : 'Could not save newsletter project.')
    } finally {
      window.setTimeout(() => setSaveStatus('idle'), 1800)
    }
  }, [campaignName, currentProjectId, editorRef, fetchProjects, fromEmail, fromName, getEmailHtml, subject, toAddress])

  const deleteProject = useCallback(async (project: NewsletterProject) => {
    const response = await fetch(`/api/newsletter/projects/${project.id}`, { method: 'DELETE' })

    if (!response.ok) {
      const data = await response.json() as { error?: string }
      toast.error(data.error ?? 'Could not delete project.')
      return
    }

    if (currentProjectId === project.id) {
      newProject()
    }

    await fetchProjects()
    toast.success(`Deleted "${project.name}"`)
  }, [currentProjectId, fetchProjects, newProject])

  const openPreview = useCallback(async () => {
    try {
      const html = await getEmailHtml()
      setPreviewHtml(html)
      setPreviewOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not prepare preview.')
    }
  }, [getEmailHtml])

  const fetchMailingLists = useCallback(async () => {
    setLoadingLists(true)
    try {
      const response = await fetch('/api/newsletter/mailing-lists')
      const data = await response.json() as { lists?: MailingList[]; error?: string }

      if (!response.ok) {
        throw new Error(data.error ?? 'Could not load Mailgun lists.')
      }

      setMailingLists(data.lists ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load Mailgun lists.')
    } finally {
      setLoadingLists(false)
    }
  }, [])

  const send = useCallback(async (payload: { testEmail?: string; toAddress?: string }) => {
    const html = await getEmailHtml()
    const response = await fetch('/api/newsletter/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromName, fromEmail, subject, html, ...payload }),
    })
    const data = await response.json() as { error?: string }

    if (!response.ok) {
      throw new Error(data.error ?? 'Could not send newsletter.')
    }
  }, [fromEmail, fromName, getEmailHtml, subject])

  const sendTest = useCallback(async () => {
    if (!testEmail.trim()) {
      toast.error('Enter a test recipient first.')
      return
    }

    setSendingTest(true)
    try {
      await send({ testEmail })
      setTestSent(true)
      toast.success(`Test email sent to ${testEmail}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send test email.')
    } finally {
      setSendingTest(false)
    }
  }, [send, testEmail])

  const sendCampaign = useCallback(async () => {
    if (!toAddress.trim()) {
      toast.error('Select or enter a mailing list address first.')
      return
    }

    setSendingCampaign(true)
    try {
      await send({ toAddress })
      setTestSent(false)
      toast.success(`Newsletter sent to ${toAddress}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send newsletter.')
    } finally {
      setSendingCampaign(false)
    }
  }, [send, toAddress])

  const markDirty = useCallback(() => {
    setDirty(true)
    setTestSent(false)
  }, [])

  return {
    campaignName,
    currentProjectId,
    dirty,
    fromEmail,
    fromName,
    loadingLists,
    loadingProjects,
    mailingLists,
    previewHtml,
    previewOpen,
    projects,
    saveStatus,
    sendingCampaign,
    sendingTest,
    subject,
    testEmail,
    testSent,
    toAddress,
    deleteProject,
    fetchMailingLists,
    fetchProjects,
    loadProject,
    loadTemplate,
    markDirty,
    newProject,
    openPreview,
    saveProject,
    sendCampaign,
    sendTest,
    setCampaignName,
    setFromEmail,
    setFromName,
    setPreviewOpen,
    setSubject,
    setTestEmail,
    setToAddress,
  }
}

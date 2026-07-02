'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  CheckCircle2Icon,
  EyeIcon,
  FilePlus2Icon,
  LayoutTemplateIcon,
  MailIcon,
  RefreshCwIcon,
  SaveIcon,
  SendIcon,
  Trash2Icon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import type { GrapesEditorHandle } from './components/GrapesEditor'
import type { NewsletterProject } from './components/types'
import { TEMPLATES } from './components/templates'
import { useNewsletter } from './useNewsletter'
import 'grapesjs/dist/css/grapes.min.css'
import './grapes-dark.css'

const GrapesEditor = dynamic(
  () => import('./components/GrapesEditor').then((module) => module.GrapesEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <Spinner />
      </div>
    ),
  }
)

type Props = {
  effectiveHasSpecialAccess: boolean
}

const formatUpdatedAt = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

function SaveStatusBadge({
  dirty,
  status,
}: {
  dirty: boolean
  status: 'idle' | 'saving' | 'saved' | 'error'
}) {
  if (status === 'saving') {
    return (
      <Badge variant="secondary">
        <Spinner data-icon="inline-start" />
        Saving
      </Badge>
    )
  }

  if (status === 'saved') {
    return (
      <Badge variant="secondary">
        <CheckCircle2Icon data-icon="inline-start" />
        Saved
      </Badge>
    )
  }

  if (status === 'error') {
    return <Badge variant="destructive">Save failed</Badge>
  }

  return <Badge variant={dirty ? 'outline' : 'secondary'}>{dirty ? 'Unsaved changes' : 'Ready'}</Badge>
}

function ProjectList({
  currentProjectId,
  loading,
  projects,
  onDelete,
  onLoad,
}: {
  currentProjectId: string | null
  loading: boolean
  projects: NewsletterProject[]
  onDelete: (project: NewsletterProject) => void
  onLoad: (project: NewsletterProject) => void
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        Loading projects
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <Empty className="min-h-32">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FilePlus2Icon />
          </EmptyMedia>
          <EmptyTitle>No saved projects</EmptyTitle>
          <EmptyDescription>Save the current campaign to keep it here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {projects.map((project) => (
        <div key={project.id} className="rounded-lg border bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => onLoad(project)}
            >
              <span className="block truncate text-sm font-medium">{project.name}</span>
              <span className="block text-xs text-muted-foreground">{formatUpdatedAt(project.updated_at)}</span>
            </button>
            <div className="flex shrink-0 items-center gap-1">
              {currentProjectId === project.id && <Badge variant="secondary">Open</Badge>}
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => onDelete(project)}>
                <Trash2Icon />
                <span className="sr-only">Delete project</span>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function NewsletterPage({ effectiveHasSpecialAccess }: Props) {
  const editorRef = useRef<GrapesEditorHandle>(null)
  const [sendConfirmed, setSendConfirmed] = useState(false)
  const newsletter = useNewsletter(editorRef)
  const { fetchMailingLists, fetchProjects } = newsletter

  useEffect(() => {
    if (!effectiveHasSpecialAccess) return

    void fetchProjects()
    void fetchMailingLists()
  }, [effectiveHasSpecialAccess, fetchMailingLists, fetchProjects])

  if (!effectiveHasSpecialAccess) {
    return (
      <Empty className="min-h-80">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MailIcon />
          </EmptyMedia>
          <EmptyTitle>Newsletter access required</EmptyTitle>
          <EmptyDescription>This workspace tool is only available to special-access users.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const canSendCampaign = newsletter.testSent && sendConfirmed && !newsletter.sendingCampaign

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white">Newsletter</h2>
            <SaveStatusBadge dirty={newsletter.dirty} status={newsletter.saveStatus} />
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Build, save, test and send Mailgun campaigns from one guarded dashboard workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={newsletter.newProject}>
            <FilePlus2Icon data-icon="inline-start" />
            New
          </Button>
          <Button type="button" variant="outline" onClick={() => void newsletter.openPreview()}>
            <EyeIcon data-icon="inline-start" />
            Preview
          </Button>
          <Button type="button" onClick={() => void newsletter.saveProject()}>
            {newsletter.saveStatus === 'saving' ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
            Save
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Campaign details</CardTitle>
          <CardDescription>These values are stored with the project and reused when sending.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
              <Field>
                <FieldLabel htmlFor="newsletter-name">Campaign name</FieldLabel>
                <Input
                  id="newsletter-name"
                  value={newsletter.campaignName}
                  onChange={(event) => {
                    newsletter.setCampaignName(event.target.value)
                    newsletter.markDirty()
                  }}
                  placeholder="June community update"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="newsletter-subject">Subject</FieldLabel>
                <Input
                  id="newsletter-subject"
                  value={newsletter.subject}
                  onChange={(event) => {
                    newsletter.setSubject(event.target.value)
                    newsletter.markDirty()
                  }}
                  placeholder="What's new at TUM Blockchain"
                />
              </Field>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="newsletter-from-name">Sender name</FieldLabel>
                <Input
                  id="newsletter-from-name"
                  value={newsletter.fromName}
                  onChange={(event) => {
                    newsletter.setFromName(event.target.value)
                    newsletter.markDirty()
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="newsletter-from-email">Sender email</FieldLabel>
                <Input
                  id="newsletter-from-email"
                  value={newsletter.fromEmail}
                  onChange={(event) => {
                    newsletter.setFromEmail(event.target.value)
                    newsletter.markDirty()
                  }}
                />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-h-[720px] py-0">
          <CardHeader className="border-b py-4">
            <CardTitle>Email editor</CardTitle>
            <CardDescription>Use email-safe blocks and HTTPS image URLs for reliable delivery.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[660px] p-0">
            <GrapesEditor
              ref={editorRef}
              onChange={newsletter.markDirty}
            />
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>Start from a compact email-safe layout.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {TEMPLATES.map((template) => (
                <Button
                  key={template.id}
                  type="button"
                  variant="outline"
                  className="h-auto justify-start whitespace-normal px-3 py-3 text-left"
                  onClick={() => newsletter.loadTemplate(template.html, template.label)}
                >
                  <LayoutTemplateIcon data-icon="inline-start" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{template.label}</span>
                    <span className="block text-xs text-muted-foreground">{template.description}</span>
                  </span>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
              <CardDescription>Saved campaigns are shared across special-access users.</CardDescription>
              <CardAction>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => void newsletter.fetchProjects()}>
                  <RefreshCwIcon />
                  <span className="sr-only">Refresh projects</span>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ProjectList
                currentProjectId={newsletter.currentProjectId}
                loading={newsletter.loadingProjects}
                projects={newsletter.projects}
                onDelete={(project) => void newsletter.deleteProject(project)}
                onLoad={newsletter.loadProject}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Send</CardTitle>
              <CardDescription>Send a test first, then unlock the campaign send.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="newsletter-test-email">Test recipient</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id="newsletter-test-email"
                      value={newsletter.testEmail}
                      onChange={(event) => newsletter.setTestEmail(event.target.value)}
                      placeholder="name@example.com"
                    />
                    <Button type="button" variant="outline" disabled={newsletter.sendingTest} onClick={() => void newsletter.sendTest()}>
                      {newsletter.sendingTest ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
                      Test
                    </Button>
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="newsletter-list">Mailing list</FieldLabel>
                  <Input
                    id="newsletter-list"
                    value={newsletter.toAddress}
                    onChange={(event) => newsletter.setToAddress(event.target.value)}
                    placeholder="list@newsletter.tum-blockchain.com"
                  />
                  <FieldDescription>Load Mailgun lists or enter a list address manually.</FieldDescription>
                </Field>

                {newsletter.mailingLists.length > 0 && (
                  <div className="flex max-h-44 flex-col gap-2 overflow-y-auto rounded-lg border p-2">
                    {newsletter.mailingLists.map((list) => (
                      <button
                        key={list.address}
                        type="button"
                        className="rounded-md px-2 py-2 text-left hover:bg-muted"
                        onClick={() => newsletter.setToAddress(list.address)}
                      >
                        <span className="block truncate text-sm font-medium">{list.address}</span>
                        <span className="block text-xs text-muted-foreground">
                          {list.name || 'Mailgun list'} · {list.membersCount} members
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <Button type="button" variant="outline" disabled={newsletter.loadingLists} onClick={() => void newsletter.fetchMailingLists()}>
                  {newsletter.loadingLists ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
                  Load lists
                </Button>

                <Separator />

                <Field orientation="horizontal" data-disabled={!newsletter.testSent}>
                  <Checkbox
                    checked={sendConfirmed}
                    disabled={!newsletter.testSent}
                    onCheckedChange={(checked) => setSendConfirmed(checked === true)}
                  />
                  <FieldContent>
                    <FieldLabel>Test email reviewed</FieldLabel>
                    <FieldDescription>Required before sending to the selected list.</FieldDescription>
                  </FieldContent>
                </Field>

                <Button type="button" disabled={!canSendCampaign} onClick={() => void newsletter.sendCampaign()}>
                  {newsletter.sendingCampaign ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
                  Send campaign
                </Button>
              </FieldGroup>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={newsletter.previewOpen} onOpenChange={newsletter.setPreviewOpen}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>Email preview</DialogTitle>
            <DialogDescription>Rendered from the inlined HTML that will be sent to Mailgun.</DialogDescription>
          </DialogHeader>
          <div className="h-[72vh] bg-muted/40 p-4">
            <iframe
              title="Newsletter preview"
              srcDoc={newsletter.previewHtml}
              className="mx-auto h-full w-full max-w-[680px] rounded-lg border bg-white"
              sandbox=""
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

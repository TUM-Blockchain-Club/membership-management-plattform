'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  CheckCircle2Icon,
  EyeIcon,
  FilePlus2Icon,
  ImageIcon,
  LayoutTemplateIcon,
  MailIcon,
  RefreshCwIcon,
  SaveIcon,
  SendIcon,
  Trash2Icon,
  UploadIcon,
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import type { GrapesEditorHandle } from './components/GrapesEditor'
import type { NewsletterAsset, NewsletterDelivery, NewsletterProject } from './components/types'
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

const formatBytes = (value?: number) => {
  if (!value) return 'Unknown size'
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

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
            <Button
              type="button"
              variant="ghost"
              className="h-auto min-w-0 flex-1 justify-start px-2 py-1 text-left"
              onClick={() => onLoad(project)}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{project.name}</span>
                <span className="block text-xs text-muted-foreground">{formatUpdatedAt(project.updated_at)}</span>
              </span>
            </Button>
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

function AssetLibrary({
  assets,
  loading,
  uploading,
  onDelete,
  onInsert,
  onRefresh,
  onUpload,
}: {
  assets: NewsletterAsset[]
  loading: boolean
  uploading: boolean
  onDelete: (asset: NewsletterAsset) => void
  onInsert: (asset: NewsletterAsset) => void
  onRefresh: () => void
  onUpload: (file: File) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Spinner data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
          Upload
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" disabled={loading} onClick={onRefresh}>
          {loading ? <Spinner /> : <RefreshCwIcon />}
          <span className="sr-only">Refresh assets</span>
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onUpload(file)
            event.target.value = ''
          }}
        />
      </div>

      {loading && assets.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Loading assets
        </div>
      ) : assets.length === 0 ? (
        <Empty className="min-h-32">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImageIcon />
            </EmptyMedia>
            <EmptyTitle>No images yet</EmptyTitle>
            <EmptyDescription>Upload email-ready images for reuse in campaigns.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ScrollArea className="h-80">
          <div className="grid grid-cols-2 gap-2 pr-3">
            {assets.map((asset) => (
              <div key={asset.path} className="overflow-hidden rounded-lg border bg-muted/20">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full rounded-none bg-background p-2"
                  onClick={() => onInsert(asset)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.src}
                    alt={asset.name}
                    className="h-20 w-full rounded-md object-contain"
                  />
                </Button>
                <div className="flex items-start justify-between gap-1 p-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(asset.size)}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => onDelete(asset)}>
                    <Trash2Icon />
                    <span className="sr-only">Delete asset</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

function DeliveryBadge({ status }: { status: NewsletterDelivery['status'] }) {
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>
  if (status === 'delivered') return <Badge variant="secondary">Delivered</Badge>
  return <Badge variant="outline">Sent</Badge>
}

function DeliveryHistory({
  deliveries,
  loading,
  onRefresh,
  onRefreshDelivery,
}: {
  deliveries: NewsletterDelivery[]
  loading: boolean
  onRefresh: () => void
  onRefreshDelivery: (delivery: NewsletterDelivery) => void
}) {
  if (loading && deliveries.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        Loading delivery history
      </div>
    )
  }

  if (deliveries.length === 0) {
    return (
      <Empty className="min-h-32">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MailIcon />
          </EmptyMedia>
          <EmptyTitle>No sends yet</EmptyTitle>
          <EmptyDescription>Test and campaign sends will appear here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="icon-sm" disabled={loading} onClick={onRefresh}>
          {loading ? <Spinner /> : <RefreshCwIcon />}
          <span className="sr-only">Refresh delivery history</span>
        </Button>
      </div>
      {deliveries.map((delivery) => {
        const opened = delivery.event_summary.opened ?? 0
        const clicked = delivery.event_summary.clicked ?? 0
        const failed = delivery.event_summary.failed ?? 0

        return (
          <div key={delivery.id} className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <DeliveryBadge status={delivery.status} />
                  <Badge variant="outline">{delivery.delivery_type === 'test' ? 'Test' : 'Campaign'}</Badge>
                </div>
                <p className="mt-2 truncate text-sm font-medium">{delivery.subject}</p>
                <p className="truncate text-xs text-muted-foreground">{delivery.recipient}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatUpdatedAt(delivery.created_at)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={loading || !delivery.mailgun_message_id}
                onClick={() => onRefreshDelivery(delivery)}
              >
                <RefreshCwIcon />
                <span className="sr-only">Refresh delivery status</span>
              </Button>
            </div>
            {(opened > 0 || clicked > 0 || failed > 0 || delivery.last_event) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {delivery.last_event && <Badge variant="secondary">{delivery.last_event}</Badge>}
                {opened > 0 && <Badge variant="outline">{opened} opened</Badge>}
                {clicked > 0 && <Badge variant="outline">{clicked} clicked</Badge>}
                {failed > 0 && <Badge variant="destructive">{failed} failed</Badge>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function NewsletterPage({ effectiveHasSpecialAccess }: Props) {
  const editorRef = useRef<GrapesEditorHandle>(null)
  const [sendConfirmed, setSendConfirmed] = useState(false)
  const newsletter = useNewsletter(editorRef)
  const { fetchAssets, fetchDeliveries, fetchMailingLists, fetchProjects } = newsletter

  useEffect(() => {
    if (!effectiveHasSpecialAccess) return

    void fetchAssets()
    void fetchDeliveries()
    void fetchProjects()
    void fetchMailingLists()
  }, [effectiveHasSpecialAccess, fetchAssets, fetchDeliveries, fetchMailingLists, fetchProjects])

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

      <div className="grid gap-5 lg:grid-cols-3">
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
            <CardTitle>Assets</CardTitle>
            <CardDescription>Upload reusable images and insert them into the editor.</CardDescription>
          </CardHeader>
          <CardContent>
            <AssetLibrary
              assets={newsletter.assets}
              loading={newsletter.loadingAssets}
              uploading={newsletter.uploadingAsset}
              onDelete={(asset) => void newsletter.deleteAsset(asset)}
              onInsert={newsletter.insertAsset}
              onRefresh={() => void newsletter.fetchAssets()}
              onUpload={(file) => void newsletter.uploadAsset(file)}
            />
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
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Email editor</CardTitle>
          <CardDescription>Use email-safe blocks and HTTPS image URLs for reliable delivery.</CardDescription>
        </CardHeader>
        <CardContent className="h-[clamp(480px,56vh,620px)] p-0">
          <GrapesEditor
            ref={editorRef}
            onChange={newsletter.markDirty}
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Send</CardTitle>
            <CardDescription>Send a test first, then unlock the campaign send.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
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
                    placeholder="list@mg.tum-blockchain.com"
                  />
                  <FieldDescription>Load Mailgun lists or enter a list address manually.</FieldDescription>
                </Field>
              </div>

              {newsletter.mailingLists.length > 0 && (
                <ScrollArea className="h-44 rounded-lg border p-2">
                  <div className="flex flex-col gap-2 pr-3">
                    {newsletter.mailingLists.map((list) => (
                      <Button
                        key={list.address}
                        type="button"
                        variant="ghost"
                        className="h-auto justify-start px-2 py-2 text-left"
                        onClick={() => newsletter.setToAddress(list.address)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{list.address}</span>
                          <span className="block text-xs text-muted-foreground">
                            {list.name || 'Mailgun list'} · {list.membersCount} members
                          </span>
                        </span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Button type="button" variant="outline" disabled={newsletter.loadingLists} onClick={() => void newsletter.fetchMailingLists()}>
                  {newsletter.loadingLists ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
                  Load lists
                </Button>

                <Field orientation="horizontal" data-disabled={!newsletter.testSent} className="lg:max-w-sm">
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
              </div>

              <Separator />

              <Button type="button" disabled={!canSendCampaign} onClick={() => void newsletter.sendCampaign()}>
                {newsletter.sendingCampaign ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
                Send campaign
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery tracking</CardTitle>
            <CardDescription>Recent Mailgun sends and refreshed event status.</CardDescription>
          </CardHeader>
          <CardContent>
            <DeliveryHistory
              deliveries={newsletter.deliveries}
              loading={newsletter.loadingDeliveries}
              onRefresh={() => void newsletter.fetchDeliveries()}
              onRefreshDelivery={(delivery) => void newsletter.refreshDelivery(delivery)}
            />
          </CardContent>
        </Card>
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

'use client'

import NextImage from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import QRCode from 'qrcode'
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  Globe2Icon,
  ImageIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  QrCodeIcon,
  SaveIcon,
  SearchIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import type { LinkAnalyticsData, LinkAnalyticsSummary, LinkDefinition } from '@/lib/server/linkAnalytics'
import { cn } from '@/lib/utils'

type QrBackground = 'white' | 'transparent'

type MetadataFormState = {
  display_label: string
  target_url: string
  deployment_region: string
  deployment_location: string
  deployment_notes: string
  deployed_at: string
}

type LinkSortMode = 'engagement' | 'alphabetical'

const QR_EXPORT_SIZE = 1440
const QR_PREVIEW_SIZE = 320
const QR_LOGO_SIZE = QR_EXPORT_SIZE / 5
const QR_LOGO_PADDING = QR_EXPORT_SIZE / 36
const QR_LOGO_RADIUS = QR_EXPORT_SIZE / 20
const getDefaultLinkYear = () => String(new Date().getFullYear()).slice(-2)

const formatMunichDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

const toFormState = (link: LinkAnalyticsSummary): MetadataFormState => ({
  display_label: link.definition.display_label ?? '',
  target_url: link.definition.target_url,
  deployment_region: link.definition.deployment_region ?? '',
  deployment_location: link.definition.deployment_location ?? '',
  deployment_notes: link.definition.deployment_notes ?? '',
  deployed_at: link.definition.deployed_at ?? '',
})

const getLinkDisplayName = (link: LinkAnalyticsSummary) =>
  link.definition.display_label?.trim() || link.definition.label

const getLinkImageUrl = (link: LinkAnalyticsSummary) =>
  link.definition.image_path
    ? `/api/link-redirects/${link.definition.year}/${link.definition.slug}/image?version=${encodeURIComponent(link.definition.updated_at ?? link.definition.image_path)}`
    : null

const isTargetMismatch = (link: LinkAnalyticsSummary) =>
  link.definition.redirect_source === 'hardcoded' &&
  Boolean(link.definition.hardcoded_target_url) &&
  link.definition.hardcoded_target_url !== link.definition.target_url

function LinkStatusBadge({ link }: { link: LinkAnalyticsSummary }) {
  if (isTargetMismatch(link)) {
    return <Badge variant="destructive">Needs promotion</Badge>
  }

  if (link.definition.redirect_source === 'hardcoded') {
    return <Badge className="bg-blue-600 text-white hover:bg-blue-600">Hardlink</Badge>
  }

  return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Softlink</Badge>
}

const emptyWeekdayBuckets = () =>
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, index) => ({
    key: String(index),
    label,
    count: 0,
  }))

const emptyHourBuckets = () =>
  Array.from({ length: 24 }, (_, hour) => ({
    key: String(hour),
    label: `${String(hour).padStart(2, '0')}:00`,
    count: 0,
  }))

const emptyDailyBuckets = (windowDays: number) =>
  Array.from({ length: windowDays }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (windowDays - index - 1))
    const key = date.toISOString().slice(0, 10)

    return {
      key,
      label: key.slice(5),
      count: 0,
    }
  })

const createEmptyLinkSummary = (
  definition: LinkDefinition,
  windowDays: number
): LinkAnalyticsSummary => ({
  key: `${definition.year}/${definition.slug}`,
  url: `https://link.tum-blockchain.com/q/${definition.year}/${definition.slug}`,
  definition,
  totalClicks: 0,
  clicksLast7Days: 0,
  averageClicksPerDay: 0,
  bestWeekday: null,
  bestHour: null,
  weekdayBuckets: emptyWeekdayBuckets(),
  hourlyBuckets: emptyHourBuckets(),
  dailyBuckets: emptyDailyBuckets(windowDays),
  countryBuckets: [],
  deviceBuckets: [],
  browserBuckets: [],
  referrerBuckets: [],
})

function StatTile({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail?: string
}) {
  return (
    <Card className="border-white/10 bg-white/[0.03] py-0">
      <CardContent className="px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/40">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        {detail && <p className="mt-1 text-xs text-white/45">{detail}</p>}
      </CardContent>
    </Card>
  )
}

function AnalyticsHeader({
  title,
  description,
  generatedAt,
}: {
  title: string
  description: string
  generatedAt: string
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{description}</p>
        </div>
        <p className="text-xs text-white/35">
          Updated {formatMunichDateTime(generatedAt)} Munich time
        </p>
      </div>
    </section>
  )
}

function BarList({
  buckets,
  maxValue,
  compact = false,
}: {
  buckets: Array<{ key: string; label: string; count: number }>
  maxValue?: number
  compact?: boolean
}) {
  const computedMax = maxValue ?? Math.max(1, ...buckets.map((bucket) => bucket.count))

  return (
    <div className={cn('flex flex-col', compact ? 'gap-2' : 'gap-3')}>
      {buckets.map((bucket) => (
        <div key={bucket.key} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3">
          <p className="truncate text-xs font-medium text-white/55">{bucket.label}</p>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${computedMax ? (bucket.count / computedMax) * 100 : 0}%` }}
            />
          </div>
          <p className="text-right font-mono text-xs text-white/70">{bucket.count}</p>
        </div>
      ))}
    </div>
  )
}

function HourHeatmap({ buckets }: { buckets: LinkAnalyticsSummary['hourlyBuckets'] }) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count))

  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12">
      {buckets.map((bucket) => (
        <div
          key={bucket.key}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-center"
        >
          <p className="font-mono text-[0.68rem] text-white/45">{bucket.label.slice(0, 2)}</p>
          <div className="mt-2 h-10 rounded bg-white/10">
            <div
              className="mt-auto rounded bg-white"
              style={{
                height: `${Math.max(8, (bucket.count / max) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1 font-mono text-xs text-white/70">{bucket.count}</p>
        </div>
      ))}
    </div>
  )
}

function QrGenerator({ link }: { link: LinkAnalyticsSummary }) {
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [background, setBackground] = useState<QrBackground>('white')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [rendering, setRendering] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function renderQr() {
      const canvas = document.createElement('canvas')

      setRendering(true)
      setPreviewUrl(null)

      await QRCode.toCanvas(canvas, link.url, {
        width: QR_EXPORT_SIZE,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#111111',
          light: background === 'white' ? '#ffffffff' : '#00000000',
        },
      })

      if (cancelled) return

      const context = canvas.getContext('2d')
      if (!context) return

      const logo = new Image()
      logo.src = '/assets/tbc-logo.png'
      await logo.decode().catch(() => null)

      if (!cancelled && logo.complete && logo.naturalWidth > 0) {
        const x = (canvas.width - QR_LOGO_SIZE) / 2
        const y = (canvas.height - QR_LOGO_SIZE) / 2

        context.fillStyle = '#ffffff'
        context.beginPath()
        context.roundRect(
          x - QR_LOGO_PADDING,
          y - QR_LOGO_PADDING,
          QR_LOGO_SIZE + QR_LOGO_PADDING * 2,
          QR_LOGO_SIZE + QR_LOGO_PADDING * 2,
          QR_LOGO_RADIUS
        )
        context.fill()
        context.drawImage(logo, x, y, QR_LOGO_SIZE, QR_LOGO_SIZE)
      }

      if (!cancelled) {
        exportCanvasRef.current = canvas
        setPreviewUrl(canvas.toDataURL('image/png'))
        setRendering(false)
      }
    }

    void renderQr()

    return () => {
      cancelled = true
    }
  }, [background, link.url])

  const download = () => {
    const canvas = exportCanvasRef.current
    if (!canvas) return

    const anchor = document.createElement('a')
    anchor.download = `${link.definition.slug}-${background}.png`
    anchor.href = canvas.toDataURL('image/png')
    anchor.click()
  }

  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <QrCodeIcon data-icon="inline-start" />
          QR Code
        </CardTitle>
        <CardDescription>Generated for {link.url} at {QR_EXPORT_SIZE}px.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={background === 'white' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBackground('white')}
          >
            White
          </Button>
          <Button
            type="button"
            variant={background === 'transparent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBackground('transparent')}
          >
            Transparent
          </Button>
        </div>

        <div className="relative flex justify-center rounded-2xl border border-white/10 bg-[linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,0.06)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,0.06)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,0.06)_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px] p-4">
          <div
            className="relative aspect-square w-full overflow-hidden rounded-xl"
            style={{ maxWidth: QR_PREVIEW_SIZE }}
          >
            {rendering && <Skeleton className="absolute inset-0 rounded-xl" />}
            {previewUrl && (
              <NextImage
                src={previewUrl}
                alt={`QR code preview for ${link.url}`}
                fill
                unoptimized
                className="rounded-xl object-contain"
              />
            )}
          </div>
        </div>

        <Button type="button" onClick={download} disabled={rendering}>
          {rendering ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
          Download PNG
        </Button>
      </CardContent>
    </Card>
  )
}

function LinkImageManager({
  link,
  onUpdated,
}: {
  link: LinkAnalyticsSummary
  onUpdated: (link: LinkAnalyticsSummary) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isPending, startTransition] = useTransition()

  const upload = (file: File | undefined) => {
    if (!file) return

    startTransition(async () => {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(
        `/api/link-redirects/${link.definition.year}/${link.definition.slug}/image`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const payload = (await response.json()) as {
        definition?: LinkAnalyticsSummary['definition']
        error?: string
      }

      if (!response.ok || !payload.definition) {
        toast.error(payload.error ?? 'Could not upload link image.')
        return
      }

      onUpdated({
        ...link,
        definition: payload.definition,
      })
      toast.success('Link image updated.')
    })
  }

  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <ImageIcon data-icon="inline-start" />
          Link Image
        </CardTitle>
        <CardDescription>Optional visual reference for this QR placement.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          {getLinkImageUrl(link) ? (
            <NextImage
              src={getLinkImageUrl(link) ?? ''}
              alt={`Uploaded image for ${getLinkDisplayName(link)}`}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/40">
              <ImageIcon aria-hidden="true" />
              <p className="text-sm">No image uploaded</p>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            upload(event.target.files?.[0])
            event.currentTarget.value = ''
          }}
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
        >
          {isPending ? <Spinner data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
          {link.definition.image_path ? 'Replace Image' : 'Upload Image'}
        </Button>
      </CardContent>
    </Card>
  )
}

function MetadataEditor({
  link,
  onUpdated,
}: {
  link: LinkAnalyticsSummary
  onUpdated: (link: LinkAnalyticsSummary) => void
}) {
  const [form, setForm] = useState(() => toFormState(link))
  const [isPending, startTransition] = useTransition()

  const updateForm = (key: keyof MetadataFormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const save = () => {
    startTransition(async () => {
      const response = await fetch(`/api/link-redirects/${link.definition.year}/${link.definition.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const payload = (await response.json()) as {
        definition?: LinkAnalyticsSummary['definition']
        error?: string
      }

      if (!response.ok || !payload.definition) {
        toast.error(payload.error ?? 'Could not update link metadata.')
        return
      }

      onUpdated({
        ...link,
        definition: payload.definition,
      })
      toast.success('Link metadata updated.')
    })
  }

  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <PencilIcon data-icon="inline-start" />
          Deployment Metadata
        </CardTitle>
        <CardDescription>
          These fields live in Supabase and are not overwritten by `pnpm sync:links`.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="display_label">Display Name</FieldLabel>
            <Input
              id="display_label"
              value={form.display_label}
              onChange={(event) => updateForm('display_label', event.target.value)}
              placeholder={link.definition.label}
            />
            <FieldDescription>
              Manual dashboard name. Leave empty to use the synced label.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="target_url">Destination URL</FieldLabel>
            <Input
              id="target_url"
              value={form.target_url}
              onChange={(event) => updateForm('target_url', event.target.value)}
              placeholder="https://conference26.tum-blockchain.com/"
            />
            <FieldDescription>
              Hardlinks keep redirecting to the hardcoded destination until `pnpm promote:links` is run in the redirect repo.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="deployment_region">Region</FieldLabel>
            <Input
              id="deployment_region"
              value={form.deployment_region}
              onChange={(event) => updateForm('deployment_region', event.target.value)}
              placeholder="Munich, Garching, Berlin..."
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="deployment_location">Location</FieldLabel>
            <Input
              id="deployment_location"
              value={form.deployment_location}
              onChange={(event) => updateForm('deployment_location', event.target.value)}
              placeholder="Main campus entrance, conference booth..."
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="deployed_at">Deployed At</FieldLabel>
            <Input
              id="deployed_at"
              type="date"
              value={form.deployed_at}
              onChange={(event) => updateForm('deployed_at', event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="deployment_notes">Notes</FieldLabel>
            <Textarea
              id="deployment_notes"
              value={form.deployment_notes}
              onChange={(event) => updateForm('deployment_notes', event.target.value)}
              placeholder="Where this QR code was placed, how many prints, who deployed it..."
              rows={5}
            />
            <FieldDescription>
              Keep this about the campaign placement, not individual visitors.
            </FieldDescription>
          </Field>
          <Button type="button" onClick={save} disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
            Save Metadata
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

function SoftLinkCreator({
  windowDays,
  onCreated,
}: {
  windowDays: number
  onCreated: (link: LinkAnalyticsSummary) => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    year: getDefaultLinkYear(),
    slug: '',
    label: '',
    target_url: '',
    origin: 'flyer',
    campaign: '',
  })
  const [isPending, startTransition] = useTransition()

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const create = () => {
    startTransition(async () => {
      const response = await fetch('/api/link-redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          variant: form.slug,
        }),
      })

      const payload = (await response.json()) as {
        definition?: LinkDefinition
        error?: string
      }

      if (!response.ok || !payload.definition) {
        toast.error(payload.error ?? 'Could not create soft link.')
        return
      }

      onCreated(createEmptyLinkSummary(payload.definition, windowDays))
      setOpen(false)
      setForm((current) => ({
        ...current,
        year: getDefaultLinkYear(),
        slug: '',
        label: '',
        target_url: '',
      }))
      toast.success('Soft link created.')
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <PlusIcon data-icon="inline-start" />
          New Softlink
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Softlink</DialogTitle>
          <DialogDescription>
            This path works immediately through Supabase fallback. Promoting it later keeps the exact same URL.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
            <Field>
              <FieldLabel htmlFor="soft_year">Year</FieldLabel>
              <Input
                id="soft_year"
                value={form.year}
                onChange={(event) => updateForm('year', event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="soft_slug">Slug</FieldLabel>
              <Input
                id="soft_slug"
                value={form.slug}
                onChange={(event) => updateForm('slug', event.target.value)}
                placeholder="fly-21"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="soft_label">Name</FieldLabel>
            <Input
              id="soft_label"
              value={form.label}
              onChange={(event) => updateForm('label', event.target.value)}
              placeholder="Flyer 21"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="soft_target_url">Destination</FieldLabel>
            <Input
              id="soft_target_url"
              value={form.target_url}
              onChange={(event) => updateForm('target_url', event.target.value)}
              placeholder="https://conference26.tum-blockchain.com/"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="soft_origin">Type</FieldLabel>
              <Input
                id="soft_origin"
                value={form.origin}
                onChange={(event) => updateForm('origin', event.target.value)}
                placeholder="flyer"
              />
              <FieldDescription>
                The material or channel, for example flyer, roll-up, poster, or instagram.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="soft_campaign">Campaign</FieldLabel>
              <Input
                id="soft_campaign"
                value={form.campaign}
                onChange={(event) => updateForm('campaign', event.target.value)}
                placeholder="conference-2026"
              />
              <FieldDescription>
                Groups related links for reporting, for example conference-2026 or flyer-2026.
              </FieldDescription>
            </Field>
          </div>
          <Button type="button" onClick={create} disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
            Create Softlink
          </Button>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  )
}

export function LinkAnalyticsOverview({ initialData }: { initialData: LinkAnalyticsData }) {
  const [links, setLinks] = useState(initialData.links)
  const [inputValue, setInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortMode, setSortMode] = useState<LinkSortMode>('engagement')
  const [, startTransition] = useTransition()

  useEffect(() => {
    const id = setTimeout(() => startTransition(() => setSearchQuery(inputValue)), 300)
    return () => clearTimeout(id)
  }, [inputValue])

  const updateTypeFilter = (value: string) => startTransition(() => setTypeFilter(value))
  const updateSortMode = (value: string) => startTransition(() => setSortMode(value as LinkSortMode))

  const uniqueTypes = useMemo(
    () => [...new Set(links.map((link) => link.definition.origin))].sort(),
    [links]
  )

  const visibleLinks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return links
      .filter((link) => {
        if (typeFilter !== 'all' && link.definition.origin !== typeFilter) return false
        if (!query) return true

        return [
          link.definition.slug,
          link.definition.label,
          link.definition.display_label,
          link.definition.origin,
          link.definition.campaign,
          link.definition.target_url,
          link.definition.deployment_region,
          link.definition.deployment_location,
        ].some((value) => value?.toLowerCase().includes(query))
      })
      .sort((a, b) => {
        if (sortMode === 'alphabetical') {
          return a.definition.slug.localeCompare(b.definition.slug)
        }

        return b.totalClicks - a.totalClicks || a.definition.slug.localeCompare(b.definition.slug)
      })
  }, [links, searchQuery, sortMode, typeFilter])

  const hasActiveFilters = typeFilter !== 'all' || sortMode !== 'engagement' || searchQuery

  const clearFilters = () => {
    setInputValue('')
    startTransition(() => {
      setSearchQuery('')
      setTypeFilter('all')
      setSortMode('engagement')
    })
  }

  return (
    <main className="flex flex-col gap-8">
      <AnalyticsHeader
        title="Link Analytics"
        description={`Aggregated QR performance for the last ${initialData.windowDays} days. Open a link row for detailed patterns and QR generation.`}
        generatedAt={initialData.generatedAt}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Tracked Links" value={links.length} />
        <StatTile label="60-Day Clicks" value={initialData.totals.clicks} />
        <StatTile label="Last 7 Days" value={initialData.totals.clicksLast7Days} />
        <StatTile label="Avg / Day" value={initialData.totals.averageClicksPerDay} />
      </div>

      {links.length === 0 ? (
        <Empty className="rounded-2xl border border-white/10 bg-white/[0.03] py-20">
          <EmptyHeader>
            <EmptyMedia>
              <QrCodeIcon className="text-white/35" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-white">No links configured</EmptyTitle>
            <EmptyDescription className="text-white/50">
              Sync link definitions from the redirect project first.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <SoftLinkCreator
              windowDays={initialData.windowDays}
              onCreated={(createdLink) => {
                setLinks((current) => [...current, createdLink])
              }}
            />
          </EmptyContent>
        </Empty>
      ) : (
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-white">Most Active Links</CardTitle>
                <CardDescription>
                  {visibleLinks.length} of {links.length} links. Engagement sort puts the most clicked link at the top.
                </CardDescription>
              </div>
              <SoftLinkCreator
                windowDays={initialData.windowDays}
                onCreated={(createdLink) => {
                  setLinks((current) => [...current, createdLink])
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <InputGroup className="h-8 w-56">
                <InputGroupAddon align="inline-start">
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type="text"
                  placeholder="Search links..."
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  className="text-sm"
                />
              </InputGroup>

              <Select value={typeFilter} onValueChange={updateTypeFilter}>
                <SelectTrigger size="sm" className="h-8 w-36">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={sortMode} onValueChange={updateSortMode}>
                <SelectTrigger size="sm" className="h-8 w-44">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="engagement">Sort by Engagement</SelectItem>
                    <SelectItem value="alphabetical">Sort Alphabetically</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 text-muted-foreground hover:text-foreground"
                >
                  <XIcon data-icon="inline-start" />
                  Clear
                </Button>
              )}
            </div>

            {visibleLinks.length === 0 ? (
              <Empty className="border-dashed py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <QrCodeIcon />
                  </EmptyMedia>
                  <EmptyTitle>No links found</EmptyTitle>
                  <EmptyDescription>Try adjusting your search or filters.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/60">Link</TableHead>
                    <TableHead className="text-white/60">Status</TableHead>
                    <TableHead className="text-right text-white/60">60 Days</TableHead>
                    <TableHead className="text-right text-white/60">7 Days</TableHead>
                    <TableHead className="text-right text-white/60">Avg / Day</TableHead>
                    <TableHead className="text-right text-white/60">Peak Hour</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleLinks.map((link) => (
                    <TableRow
                      key={link.key}
                      className="border-white/10 hover:bg-white/[0.04]"
                    >
                      <TableCell>
                        <Link
                          href={`/link-analytics/${link.definition.year}/${link.definition.slug}`}
                          className="flex min-w-60 flex-col gap-1"
                        >
                          <span className="text-sm font-medium text-white">{getLinkDisplayName(link)}</span>
                          <span className="truncate font-mono text-xs text-white/45">
                            {link.definition.slug} · {link.definition.origin}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <LinkStatusBadge link={link} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-white">{link.totalClicks}</TableCell>
                      <TableCell className="text-right font-mono text-white">{link.clicksLast7Days}</TableCell>
                      <TableCell className="text-right font-mono text-white">{link.averageClicksPerDay}</TableCell>
                      <TableCell className="text-right font-mono text-white">
                        {link.bestHour?.label ?? 'n/a'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  )
}

export function LinkAnalyticsDetail({
  initialData,
  initialLink,
}: {
  initialData: LinkAnalyticsData
  initialLink: LinkAnalyticsSummary
}) {
  const [link, setLink] = useState(initialLink)

  return (
    <main className="flex flex-col gap-8">
      <AnalyticsHeader
        title={getLinkDisplayName(link)}
        description={`Detailed analytics for ${link.url}`}
        generatedAt={initialData.generatedAt}
      />

      <div>
        <Button asChild variant="outline" size="sm">
          <Link href="/link-analytics">
            <ArrowLeftIcon data-icon="inline-start" />
            Back to Table
          </Link>
        </Button>
      </div>

      <Card className="border-white/10 bg-white/[0.03]">
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <LinkStatusBadge link={link} />
              <Badge>{link.definition.origin}</Badge>
              <Badge variant="outline">{link.definition.campaign}</Badge>
            </div>
            <CardTitle className="text-2xl text-white">{getLinkDisplayName(link)}</CardTitle>
            <CardDescription className="mt-2 flex flex-wrap items-center gap-2 font-mono">
              <span>{link.url}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => {
                  void navigator.clipboard.writeText(link.url)
                  toast.success('Link copied.')
                }}
              >
                <CopyIcon data-icon="inline-start" />
                Copy
              </Button>
            </CardDescription>
            <p className="mt-2 font-mono text-xs text-white/45">Slug: {link.definition.slug}</p>
            <p className="mt-2 text-xs text-white/45">
              Destination: <span className="font-mono">{link.definition.target_url}</span>
            </p>
            {isTargetMismatch(link) && (
              <p className="mt-2 text-xs text-destructive">
                Hardcoded destination still points to{' '}
                <span className="font-mono">{link.definition.hardcoded_target_url}</span>. Run
                `pnpm promote:links` in the redirect repo to make the hardcoded path match Supabase.
              </p>
            )}
          </div>
          <Button asChild variant="outline">
            <a href={link.url} target="_blank" rel="noreferrer">
              <ExternalLinkIcon data-icon="inline-start" />
              Open
            </a>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Clicks" value={link.totalClicks} detail="last 60 days" />
            <StatTile label="Last 7 Days" value={link.clicksLast7Days} />
            <StatTile label="Avg / Day" value={link.averageClicksPerDay} />
            <StatTile
              label="Peak Hour"
              value={link.bestHour?.label ?? 'n/a'}
              detail={`${link.bestHour?.count ?? 0} clicks`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <CalendarDaysIcon className="text-white/45" aria-hidden="true" />
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/35">Best Weekday</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {link.bestWeekday?.label ?? 'n/a'} · {link.bestWeekday?.count ?? 0} clicks
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <Globe2Icon className="text-white/45" aria-hidden="true" />
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/35">Top Country</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {link.countryBuckets[0]?.label ?? 'unknown'} · {link.countryBuckets[0]?.count ?? 0}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <MapPinIcon className="text-white/45" aria-hidden="true" />
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/35">Deployment</p>
                <p className="mt-1 truncate text-sm font-medium text-white">
                  {link.definition.deployment_region || 'not set'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem_25rem]">
        <MetadataEditor key={link.key} link={link} onUpdated={setLink} />
        <LinkImageManager link={link} onUpdated={setLink} />
        <QrGenerator link={link} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-white">Weekday Pattern</CardTitle>
            <CardDescription>Which day of the week performs best.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList buckets={link.weekdayBuckets} />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-white">Daily Trend</CardTitle>
            <CardDescription>Most active days in the last 60-day window.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              buckets={[...link.dailyBuckets]
                .sort((a, b) => b.count - a.count || b.key.localeCompare(a.key))
                .slice(0, 14)}
              compact
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="text-white">Hour-of-Day Heatmap</CardTitle>
          <CardDescription>Munich local time, based on hour-rounded tracking timestamps.</CardDescription>
        </CardHeader>
        <CardContent>
          <HourHeatmap buckets={link.hourlyBuckets} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-white">Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList buckets={link.countryBuckets} compact />
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-white">Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList buckets={link.deviceBuckets} compact />
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-white">Browsers</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList buckets={link.browserBuckets} compact />
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-white">Referrers</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList buckets={link.referrerBuckets} compact />
          </CardContent>
        </Card>
      </div>

    </main>
  )
}

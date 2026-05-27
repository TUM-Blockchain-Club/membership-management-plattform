'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import QRCode from 'qrcode'
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  DownloadIcon,
  ExternalLinkIcon,
  Globe2Icon,
  MapPinIcon,
  PencilIcon,
  QrCodeIcon,
  SaveIcon,
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
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
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
import type { LinkAnalyticsData, LinkAnalyticsSummary } from '@/lib/server/linkAnalytics'
import { cn } from '@/lib/utils'

type QrBackground = 'white' | 'transparent'

type MetadataFormState = {
  deployment_region: string
  deployment_location: string
  deployment_notes: string
  deployed_at: string
}

const toFormState = (link: LinkAnalyticsSummary): MetadataFormState => ({
  deployment_region: link.definition.deployment_region ?? '',
  deployment_location: link.definition.deployment_location ?? '',
  deployment_notes: link.definition.deployment_notes ?? '',
  deployed_at: link.definition.deployed_at ?? '',
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
  children,
}: {
  title: string
  description: string
  generatedAt: string
  children?: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 w-fit">
            Board Only
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight text-white">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{description}</p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <p className="text-xs text-white/35">
            Updated {new Date(generatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          {children}
        </div>
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [background, setBackground] = useState<QrBackground>('white')
  const [rendering, setRendering] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function renderQr() {
      const canvas = canvasRef.current
      if (!canvas) return

      setRendering(true)

      await QRCode.toCanvas(canvas, link.url, {
        width: 360,
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
        const size = 72
        const x = (canvas.width - size) / 2
        const y = (canvas.height - size) / 2

        context.fillStyle = '#ffffff'
        context.beginPath()
        context.roundRect(x - 10, y - 10, size + 20, size + 20, 18)
        context.fill()
        context.drawImage(logo, x, y, size, size)
      }

      if (!cancelled) {
        setRendering(false)
      }
    }

    void renderQr()

    return () => {
      cancelled = true
    }
  }, [background, link.url])

  const download = () => {
    const canvas = canvasRef.current
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
        <CardDescription>Generated for {link.url}</CardDescription>
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
          {rendering && <Skeleton className="absolute size-80 rounded-xl" />}
          <canvas ref={canvasRef} className="size-80 max-w-full rounded-xl" />
        </div>

        <Button type="button" onClick={download} disabled={rendering}>
          {rendering ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
          Download PNG
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

export function LinkAnalyticsOverview({ initialData }: { initialData: LinkAnalyticsData }) {
  return (
    <main className="flex flex-col gap-8">
      <AnalyticsHeader
        title="Link Analytics"
        description={`Aggregated QR performance for the last ${initialData.windowDays} days. Open a link row for detailed patterns and QR generation.`}
        generatedAt={initialData.generatedAt}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Tracked Links" value={initialData.totals.links} />
        <StatTile label="60-Day Clicks" value={initialData.totals.clicks} />
        <StatTile label="Last 7 Days" value={initialData.totals.clicksLast7Days} />
        <StatTile label="Avg / Day" value={initialData.totals.averageClicksPerDay} />
      </div>

      {initialData.links.length === 0 ? (
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
          <EmptyContent />
        </Empty>
      ) : (
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-white">Most Active Links</CardTitle>
            <CardDescription>Sorted by clicks in the last 60 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">Link</TableHead>
                  <TableHead className="text-right text-white/60">60 Days</TableHead>
                  <TableHead className="text-right text-white/60">7 Days</TableHead>
                  <TableHead className="text-right text-white/60">Avg / Day</TableHead>
                  <TableHead className="text-right text-white/60">Peak Hour</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialData.links.map((link) => (
                  <TableRow
                    key={link.key}
                    className="border-white/10 hover:bg-white/[0.04]"
                  >
                    <TableCell>
                      <Link
                        href={`/link-analytics/${link.definition.year}/${link.definition.slug}`}
                        className="flex min-w-60 flex-col gap-1"
                      >
                        <span className="font-mono text-sm font-medium text-white">{link.definition.slug}</span>
                        <span className="truncate text-xs text-white/45">
                          {link.definition.label} · {link.definition.origin}
                        </span>
                      </Link>
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
        title={link.definition.label}
        description={`Detailed analytics for ${link.url}`}
        generatedAt={initialData.generatedAt}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/link-analytics">
            <ArrowLeftIcon data-icon="inline-start" />
            Back to Table
          </Link>
        </Button>
      </AnalyticsHeader>

      <Card className="border-white/10 bg-white/[0.03]">
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge>{link.definition.origin}</Badge>
              <Badge variant="outline">{link.definition.campaign}</Badge>
            </div>
            <CardTitle className="text-2xl text-white">{link.definition.slug}</CardTitle>
            <CardDescription className="mt-2 font-mono">{link.url}</CardDescription>
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
            <CardDescription>Recent click volume across the 60-day window.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList buckets={link.dailyBuckets.slice(-14)} compact />
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="text-white">Hour-of-Day Heatmap</CardTitle>
          <CardDescription>UTC hours, based on hour-rounded tracking timestamps.</CardDescription>
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

      <Separator className="bg-white/10" />

      <div className="grid gap-6 lg:grid-cols-[1fr_25rem]">
        <MetadataEditor key={link.key} link={link} onUpdated={setLink} />
        <QrGenerator link={link} />
      </div>
    </main>
  )
}

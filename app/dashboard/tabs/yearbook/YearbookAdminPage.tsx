'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  BookHeartIcon,
  DownloadIcon,
  ImageIcon,
  LockIcon,
  PrinterIcon,
  SearchIcon,
  Trash2Icon,
  UnlockIcon,
} from 'lucide-react'
import { DateTimePicker } from '@/components/date-picker'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { YEARBOOK_MAX_TITLE_LENGTH, type YearbookAdminData, type YearbookEdition } from '@/lib/yearbook'
import { yearbookRequest } from './yearbookClient'

const localValue = (value: string | null) => (value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : '')
const toIso = (value: string) => (value ? new Date(value).toISOString() : null)

function CreateEditionCard({ onCreated }: { onCreated: (edition: YearbookEdition) => void }) {
  const [title, setTitle] = useState(`TBC Yearbook ${new Date().getFullYear()}`)
  const [closesAt, setClosesAt] = useState('')
  const [saving, setSaving] = useState(false)

  async function create() {
    setSaving(true)
    try {
      const { edition } = await yearbookRequest<{ edition: YearbookEdition }>('/api/yearbook/editions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, closesAt: toIso(closesAt) }),
      })
      toast.success(`${edition.title} is open. Members can join now.`)
      onCreated(edition)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open the yearbook.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open a new yearbook</CardTitle>
        <CardDescription>Members can join and write messages as soon as it is open. Only one yearbook can be open at a time.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="yearbook-title">Title</FieldLabel>
          <Input id="yearbook-title" value={title} maxLength={YEARBOOK_MAX_TITLE_LENGTH} onChange={(event) => setTitle(event.target.value)} disabled={saving} />
        </Field>
        <Field>
          <FieldLabel htmlFor="yearbook-closes">Deadline (optional)</FieldLabel>
          <DateTimePicker id="yearbook-closes" value={closesAt} onChange={setClosesAt} disabled={saving} placeholder="No deadline" />
          <FieldDescription>After the deadline nobody can join or edit. You can also close it manually.</FieldDescription>
        </Field>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={create} disabled={saving || !title.trim()}>
          <BookHeartIcon data-icon="inline-start" />
          {saving ? 'Opening…' : 'Open yearbook'}
        </Button>
      </CardFooter>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export function YearbookAdminPage({ data }: { data: YearbookAdminData }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const selected = data.selected
  const [deadline, setDeadline] = useState(localValue(selected?.closesAt ?? null))
  const hasOpenEdition = data.editions.some((edition) => edition.status === 'open')
  const refresh = () => startTransition(() => router.refresh())

  const visibleEntries = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return data.entries
    return data.entries.filter((entry) =>
      `${entry.authorName} ${entry.subjectName} ${entry.body}`.toLowerCase().includes(needle),
    )
  }, [data.entries, query])

  async function updateEdition(patch: Record<string, unknown>, success: string) {
    if (!selected) return
    setBusy(true)
    try {
      await yearbookRequest(`/api/yearbook/editions/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      toast.success(success)
      refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update the yearbook.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteEntry(id: string) {
    setBusy(true)
    try {
      await yearbookRequest(`/api/yearbook/entries/${id}`, { method: 'DELETE' })
      toast.success('Message removed.')
      refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove the message.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!hasOpenEdition && <CreateEditionCard onCreated={(edition) => router.push(`/yearbook/admin?edition=${edition.id}`)} />}

      {!selected ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><BookHeartIcon /></EmptyMedia>
            <EmptyTitle>No yearbooks yet</EmptyTitle>
            <EmptyDescription>Open the first yearbook above. Members will see it in the Yearbook tab.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {selected.title}
                <Badge variant={selected.status === 'open' ? 'default' : 'secondary'}>{selected.status === 'open' ? 'Open' : 'Closed'}</Badge>
              </CardTitle>
              <CardDescription>
                Created {format(new Date(selected.createdAt), 'd MMM yyyy')}
                {selected.closesAt && ` · Deadline ${format(new Date(selected.closesAt), "d MMM yyyy 'at' HH:mm")}`}
              </CardDescription>
              {data.editions.length > 1 && (
                <CardAction>
                  <Select value={selected.id} onValueChange={(id) => router.push(`/yearbook/admin?edition=${id}`)}>
                    <SelectTrigger size="sm" aria-label="Choose yearbook"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {data.editions.map((edition) => (
                        <SelectItem key={edition.id} value={edition.id}>
                          {edition.title} ({edition.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Participants" value={data.stats.participants} />
                <Stat label="Messages" value={data.stats.entries} />
                <Stat label="Printable messages" value={data.stats.printableEntries} />
                <Stat label="Photos" value={data.stats.photos} />
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Export for print</p>
                <p className="text-sm text-muted-foreground">
                  Includes one page per participant with messages from other participants. Photo links in CSV and JSON stay valid for 7 days.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={`/print/yearbook/${selected.id}`} target="_blank" rel="noopener">
                      <PrinterIcon data-icon="inline-start" />
                      Print view (PDF)
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={`/api/yearbook/editions/${selected.id}/export?format=csv`} download>
                      <DownloadIcon data-icon="inline-start" />
                      CSV
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={`/api/yearbook/editions/${selected.id}/export?format=json`} download>
                      <DownloadIcon data-icon="inline-start" />
                      JSON
                    </a>
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,22rem)_auto] sm:items-end">
                <Field>
                  <FieldLabel htmlFor="yearbook-deadline">Deadline</FieldLabel>
                  <DateTimePicker id="yearbook-deadline" value={deadline} onChange={setDeadline} disabled={busy} placeholder="No deadline" />
                </Field>
                <Button
                  variant="outline"
                  disabled={busy || deadline === localValue(selected.closesAt)}
                  onClick={() => updateEdition({ closesAt: toIso(deadline) }, 'Deadline saved.')}
                >
                  Save deadline
                </Button>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              {selected.status === 'open' ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={busy}>
                      <LockIcon data-icon="inline-start" />
                      Close yearbook
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Close {selected.title}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Members can no longer join, write or edit. Everything stays saved and you can reopen it later if no other yearbook is open.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => updateEdition({ status: 'closed' }, 'The yearbook is closed.')}>Close yearbook</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  variant="outline"
                  disabled={busy || hasOpenEdition}
                  title={hasOpenEdition ? 'Close the open yearbook first' : undefined}
                  onClick={() => updateEdition({ status: 'open' }, 'The yearbook is open again.')}
                >
                  <UnlockIcon data-icon="inline-start" />
                  Reopen yearbook
                </Button>
              )}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Participants</CardTitle>
              <CardDescription>Members who opted in. Each gets a printed page.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.participants.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nobody has joined yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-center">Photo</TableHead>
                      <TableHead className="text-center">Quote</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Written</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.participants.map((participant) => (
                      <TableRow key={participant.memberId}>
                        <TableCell>
                          <p className="font-medium">{participant.name}</p>
                          <p className="text-xs text-muted-foreground">{participant.department || 'No department'}</p>
                        </TableCell>
                        <TableCell className="text-center">{participant.hasPortrait ? 'Yes' : 'Profile'}</TableCell>
                        <TableCell className="text-center">{participant.hasQuote ? 'Yes' : '–'}</TableCell>
                        <TableCell className="text-right tabular-nums">{participant.printableReceived}</TableCell>
                        <TableCell className="text-right tabular-nums">{participant.written}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Review messages before print. Removing one deletes it and its photo permanently.</CardDescription>
              <CardAction>
                <InputGroup>
                  <InputGroupAddon><SearchIcon /></InputGroupAddon>
                  <InputGroupInput type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages" aria-label="Search messages" />
                </InputGroup>
              </CardAction>
            </CardHeader>
            <CardContent>
              {visibleEntries.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  {data.entries.length === 0 ? 'No messages yet.' : 'No messages match your search.'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From → To</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="align-top">
                          <p className="font-medium">{entry.authorName}</p>
                          <p className="text-xs text-muted-foreground">→ {entry.subjectName}</p>
                          {!entry.isPrintable && <Badge variant="outline" className="mt-1 text-muted-foreground">Not printed</Badge>}
                        </TableCell>
                        <TableCell className="max-w-md whitespace-normal align-top">
                          <p className="line-clamp-3 text-sm">{entry.body}</p>
                          {entry.hasPhoto && (
                            <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><ImageIcon className="size-3" />With photo</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon-sm" disabled={busy} aria-label={`Remove message from ${entry.authorName} to ${entry.subjectName}`}>
                                <Trash2Icon />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove this message?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  The message from {entry.authorName} to {entry.subjectName} and its photo are deleted permanently. This can&apos;t be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction variant="destructive" onClick={() => deleteEntry(entry.id)}>Remove</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

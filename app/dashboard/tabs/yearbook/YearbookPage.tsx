'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { BookHeartIcon, LockIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { YearbookEdition, YearbookHomeData, YearbookMemberSummary, YearbookWrittenEntry } from '@/lib/yearbook'
import { YearbookDirectory } from './YearbookDirectory'
import { YearbookEntryDialog } from './YearbookEntryDialog'
import { YearbookJoinSelector } from './YearbookJoinSelector'
import { YearbookMyPage } from './YearbookMyPage'
import { YearbookReceived } from './YearbookReceived'

function EditionSummary({ edition, writable, participantCount }: { edition: YearbookEdition; writable: boolean; participantCount: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookHeartIcon className="size-5 text-primary" />
          {edition.title}
        </CardTitle>
        <CardDescription>
          {participantCount} member{participantCount === 1 ? '' : 's'} in the yearbook
          {edition.closesAt && ` · ${writable ? 'Closes' : 'Closed'} ${format(new Date(edition.closesAt), "d MMM yyyy 'at' HH:mm")}`}
        </CardDescription>
        <CardAction>
          <Badge variant={writable ? 'default' : 'secondary'}>{writable ? 'Open' : 'Closed'}</Badge>
        </CardAction>
      </CardHeader>
    </Card>
  )
}

type WrittenOverrides = Map<number, YearbookWrittenEntry | null>
const NO_OVERRIDES: WrittenOverrides = new Map()

export function YearbookPage({ data }: { data: YearbookHomeData }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [selected, setSelected] = useState<YearbookMemberSummary | null>(null)
  // Saved/deleted messages show immediately; the overrides are dropped as soon as
  // refreshed server data (a new `data.written` array) arrives.
  const [local, setLocal] = useState({ base: data.written, overrides: NO_OVERRIDES })
  const overrides = local.base === data.written ? local.overrides : NO_OVERRIDES
  const written = useMemo(() => {
    if (overrides.size === 0) return data.written
    const kept = data.written.filter((entry) => !overrides.has(entry.subjectId))
    const saved = [...overrides.values()].filter((entry): entry is YearbookWrittenEntry => entry !== null)
    return [...kept, ...saved]
  }, [data.written, overrides])
  const refresh = () => startTransition(() => router.refresh())

  function recordSaved(subjectId: number, entry: YearbookWrittenEntry | null) {
    setLocal({ base: data.written, overrides: new Map(overrides).set(subjectId, entry) })
    setSelected(null)
    refresh()
  }

  if (!data.edition) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><BookHeartIcon /></EmptyMedia>
          <EmptyTitle>The yearbook isn&apos;t open yet</EmptyTitle>
          <EmptyDescription>
            Once the board opens this year&apos;s yearbook, you can join and write messages for other members here.
          </EmptyDescription>
        </EmptyHeader>
        {data.canManage && (
          <EmptyContent>
            <Button asChild><Link href="/yearbook/admin">Open a yearbook</Link></Button>
          </EmptyContent>
        )}
      </Empty>
    )
  }

  const { edition, isWritable, participation } = data

  if (!participation) {
    if (!isWritable) {
      return (
        <div className="flex flex-col gap-6">
          <EditionSummary edition={edition} writable={false} participantCount={data.participantCount} />
          <Alert>
            <LockIcon />
            <AlertTitle>{edition.title} is closed</AlertTitle>
            <AlertDescription>You didn&apos;t join this yearbook. It is now being prepared for print.</AlertDescription>
          </Alert>
        </div>
      )
    }
    return <YearbookJoinSelector edition={edition} participantCount={data.participantCount} />
  }

  const selectedEntry = selected ? written.find((entry) => entry.subjectId === selected.id) ?? null : null
  const printableReceived = data.received.filter((entry) => entry.isPrintable).length

  return (
    <div className="flex flex-col gap-6">
      <EditionSummary edition={edition} writable={isWritable} participantCount={data.participantCount} />

      {!isWritable && (
        <Alert>
          <LockIcon />
          <AlertTitle>The yearbook is closed</AlertTitle>
          <AlertDescription>Messages and pages are locked while the yearbook is prepared for print.</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="write" className="gap-4">
        <TabsList>
          <TabsTrigger value="write">Write messages</TabsTrigger>
          <TabsTrigger value="page">My page</TabsTrigger>
          <TabsTrigger value="received">
            About me
            {data.received.length > 0 && <Badge variant="secondary" className="ml-1">{data.received.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="write">
          <p className="mb-4 text-sm text-muted-foreground">
            Pick anyone in TBC and write them a message. You have written {written.length} so far.
          </p>
          <YearbookDirectory members={data.members} written={written} onSelect={setSelected} />
        </TabsContent>

        <TabsContent value="page">
          <YearbookMyPage
            key={`${participation.quote ?? ''}|${participation.portraitUrl ?? ''}`}
            viewer={data.viewer}
            participation={participation}
            receivedCount={printableReceived}
            writable={isWritable}
            onChanged={refresh}
          />
        </TabsContent>

        <TabsContent value="received">
          <p className="mb-4 text-sm text-muted-foreground">
            Messages from members who aren&apos;t in the yearbook are marked &ldquo;Not printed&rdquo; until they join.
          </p>
          <YearbookReceived entries={data.received} />
        </TabsContent>
      </Tabs>

      {selected && (
        <YearbookEntryDialog
          key={selected.id}
          member={selected}
          entry={selectedEntry}
          writable={isWritable}
          onClose={() => setSelected(null)}
          onSaved={(entry) => recordSaved(selected.id, entry)}
        />
      )}
    </div>
  )
}

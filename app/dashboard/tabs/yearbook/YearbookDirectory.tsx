'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { CheckIcon, ImageIcon, SearchIcon, UsersIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import type { YearbookMemberSummary, YearbookWrittenEntry } from '@/lib/yearbook'
import { YearbookMemberPhoto } from './YearbookMemberPhoto'

type Filter = 'all' | 'joined' | 'written' | 'todo'
const PAGE_SIZE = 48

export function YearbookDirectory({
  members,
  written,
  onSelect,
}: {
  members: YearbookMemberSummary[]
  written: YearbookWrittenEntry[]
  onSelect: (member: YearbookMemberSummary) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const deferredQuery = useDeferredValue(query)
  const writtenBySubject = useMemo(() => new Map(written.map((entry) => [entry.subjectId, entry])), [written])

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase()
    const matches = members.filter((member) => {
      if (needle && !`${member.name} ${member.department ?? ''}`.toLowerCase().includes(needle)) return false
      if (filter === 'joined') return member.isParticipant
      if (filter === 'written') return writtenBySubject.has(member.id)
      if (filter === 'todo') return member.isParticipant && !writtenBySubject.has(member.id)
      return true
    })
    // Members you already wrote for move to the top; the rest keep alphabetical order (stable sort).
    return matches.sort((a, b) => Number(writtenBySubject.has(b.id)) - Number(writtenBySubject.has(a.id)))
  }, [deferredQuery, filter, members, writtenBySubject])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setLimit(PAGE_SIZE) }}
            placeholder="Search members or departments"
            aria-label="Search members"
          />
        </InputGroup>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={filter}
          onValueChange={(value) => { if (value) { setFilter(value as Filter); setLimit(PAGE_SIZE) } }}
          aria-label="Filter members"
          className="flex-wrap"
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="joined">In the yearbook</ToggleGroupItem>
          <ToggleGroupItem value="todo">Not written yet</ToggleGroupItem>
          <ToggleGroupItem value="written">Written ({written.length})</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {visible.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
            <EmptyTitle>No members found</EmptyTitle>
            <EmptyDescription>
              {filter === 'written' ? "You haven't written any messages yet." : 'Try another name or filter.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // Container queries size the grid by the space it actually has, with or without the sidebar.
        <div className="@container">
          <ul className="grid grid-cols-1 gap-3 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
            {visible.slice(0, limit).map((member) => {
              const entry = writtenBySubject.get(member.id)
              return (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(member)}
                    aria-label={`${entry ? 'Edit your message for' : 'Write a message for'} ${member.name}`}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring',
                      entry && 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15',
                    )}
                  >
                    <span className="relative shrink-0">
                      <YearbookMemberPhoto
                        name={member.name}
                        src={member.pictureUrl}
                        className={cn('size-12 text-sm', entry && 'ring-2 ring-emerald-500/60')}
                      />
                      {entry?.hasPhoto && (
                        <span
                          title="You added a photo"
                          className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-card"
                        >
                          <ImageIcon className="size-3" aria-hidden="true" />
                          <span className="sr-only">with your photo</span>
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate font-medium">{member.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{member.department || 'TBC member'}</span>
                      <span className="flex flex-wrap gap-1">
                        {entry && (
                          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                            <CheckIcon data-icon="inline-start" />
                            Written
                          </Badge>
                        )}
                        {member.isParticipant
                          ? <Badge variant="secondary">In the yearbook</Badge>
                          : <Badge variant="outline" className="text-muted-foreground">Not joined</Badge>}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {visible.length > limit && (
        <Button variant="outline" className="self-center" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
          Show more members ({visible.length - limit} more)
        </Button>
      )}
    </div>
  )
}

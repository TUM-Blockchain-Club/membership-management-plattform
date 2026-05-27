'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { PlusIcon, SearchIcon, UsersIcon, XIcon } from 'lucide-react'
import { MemberCardV2 } from '@/app/components/dashboard/MemberCardV2'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { DashboardMember } from '@/app/components/dashboard/types'

// ── Section config ────────────────────────────────────────────────────────

type SectionConfig = {
  id: string
  label: string
  dot: string
  members: DashboardMember[]
  isHonorary?: boolean
  isAlumni?: boolean
  isAdvisor?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────

export function MembersPageV2({
  boardMembers,
  coreMembers,
  exCoreHonorary,
  exCoreAlumni,
  exCoreAdvisors,
  exCoreOthers,
  otherMembers,
  member,
  hasSpecialAccess,
  handleAddMember,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  departmentFilter,
  setDepartmentFilter,
  roleFilter,
  setRoleFilter,
  uniqueStatuses,
  uniqueDepartments,
  uniqueRoles,
  filteredMembers,
  membersVisibleByRole,
  getPictureUrl,
  canEditMember,
  handleEditClick,
  handleEditOtherMember,
}: {
  boardMembers: DashboardMember[]
  coreMembers: DashboardMember[]
  exCoreHonorary: DashboardMember[]
  exCoreAlumni: DashboardMember[]
  exCoreAdvisors: DashboardMember[]
  exCoreOthers: DashboardMember[]
  otherMembers: DashboardMember[]
  member: DashboardMember | null
  hasSpecialAccess: boolean
  handleAddMember: () => void
  searchQuery: string
  setSearchQuery: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
  departmentFilter: string
  setDepartmentFilter: (v: string) => void
  roleFilter: string
  setRoleFilter: (v: string) => void
  uniqueStatuses: string[]
  uniqueDepartments: string[]
  uniqueRoles: string[]
  filteredMembers: DashboardMember[]
  membersVisibleByRole: DashboardMember[]
  getPictureUrl: (picture: unknown) => string | null
  canEditMember: (targetMember: DashboardMember) => boolean
  handleEditClick: () => void
  handleEditOtherMember: (targetMember: DashboardMember) => void
}) {
  const [inputValue, setInputValue] = useState(searchQuery)
  const [, startTransition] = useTransition()

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => startTransition(() => setSearchQuery(inputValue)), 300)
    return () => clearTimeout(id)
  }, [inputValue, setSearchQuery])

  const updateStatus     = useCallback((v: string) => startTransition(() => setStatusFilter(v)),     [setStatusFilter])
  const updateDepartment = useCallback((v: string) => startTransition(() => setDepartmentFilter(v)), [setDepartmentFilter])
  const updateRole       = useCallback((v: string) => startTransition(() => setRoleFilter(v)),       [setRoleFilter])

  const hasActiveFilters = statusFilter !== 'all' || departmentFilter !== 'all' || roleFilter !== 'all' || searchQuery

  const clearFilters = useCallback(() => {
    setInputValue('')
    startTransition(() => {
      setStatusFilter('all')
      setDepartmentFilter('all')
      setRoleFilter('all')
      setSearchQuery('')
    })
  }, [setStatusFilter, setDepartmentFilter, setRoleFilter, setSearchQuery])

  // Build a Set for fast membership tests
  const filteredIds = useMemo(() => new Set(filteredMembers.map((m) => m.id)), [filteredMembers])

  // All sections; we'll hide empty ones after applying filters
  const sections: SectionConfig[] = useMemo(() => [
    { id: 'board',    label: 'Board',    dot: 'bg-yellow-500', members: boardMembers },
    { id: 'core',     label: 'Core',     dot: 'bg-blue-500',   members: coreMembers },
    { id: 'honorary', label: 'Honorary', dot: 'bg-amber-500',  members: exCoreHonorary, isHonorary: true },
    { id: 'alumni',   label: 'Alumni',   dot: 'bg-emerald-500',members: exCoreAlumni,   isAlumni:   true },
    { id: 'advisors', label: 'Advisors', dot: 'bg-indigo-400', members: exCoreAdvisors, isAdvisor:  true },
    { id: 'others',   label: 'Others',   dot: 'bg-white/30',   members: [...exCoreOthers, ...otherMembers] },
  ], [boardMembers, coreMembers, exCoreHonorary, exCoreAlumni, exCoreAdvisors, exCoreOthers, otherMembers])

  const visibleSections = useMemo(
    () => sections
      .map((s) => ({ ...s, visible: s.members.filter((m) => filteredIds.has(m.id)) }))
      .filter((s) => s.visible.length > 0),
    [sections, filteredIds],
  )

  const canAdd = member?.Role === 'Board Member' || hasSpecialAccess

  return (
    <div>

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filteredMembers.length !== membersVisibleByRole.length
              ? `${filteredMembers.length} of ${membersVisibleByRole.length}`
              : membersVisibleByRole.length}{' '}
            {membersVisibleByRole.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        {canAdd && (
          <Button size="sm" onClick={handleAddMember} className="shrink-0">
            <PlusIcon data-icon="inline-start" />
            Add Member
          </Button>
        )}
      </div>

      {/* ── Filter toolbar ───────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-8">

        {/* Search — uses InputGroup per shadcn rules */}
        <InputGroup className="h-8 w-48">
          <InputGroupAddon align="inline-start">
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            placeholder="Search…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="text-sm"
          />
        </InputGroup>

        {/* Status */}
        <Select value={statusFilter} onValueChange={updateStatus}>
          <SelectTrigger size="sm" className="h-8 w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Department */}
        <Select value={departmentFilter} onValueChange={updateDepartment}>
          <SelectTrigger size="sm" className="h-8 w-44">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Departments</SelectItem>
              {uniqueDepartments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Role */}
        <Select value={roleFilter} onValueChange={updateRole}>
          <SelectTrigger size="sm" className="h-8 w-36">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Roles</SelectItem>
              {uniqueRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Clear */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-muted-foreground hover:text-foreground">
            <XIcon data-icon="inline-start" />
            Clear
          </Button>
        )}
      </div>

      {/* ── Member sections ──────────────────────────────────── */}
      {visibleSections.length === 0 ? (
        <Empty className="border-dashed mt-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No members found</EmptyTitle>
            <EmptyDescription>Try adjusting your search or filters.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-10">
          {visibleSections.map(({ id, label, dot, visible, isHonorary, isAlumni, isAdvisor }) => (
            <div key={id} id={id}>

              {/* Section heading */}
              <div className="flex items-center gap-3 mb-4">
                <span className={cn('size-2 rounded-full shrink-0', dot)} />
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground shrink-0">
                  {label}
                </span>
                <Separator className="flex-1" />
                <span className="text-[10px] text-muted-foreground tabular-nums">{visible.length}</span>
              </div>

              {/* Card grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visible.map((m) => (
                  <MemberCardV2
                    key={m.id}
                    member={m}
                    getPictureUrl={getPictureUrl}
                    isHonorary={isHonorary}
                    isAlumni={isAlumni}
                    isAdvisor={isAdvisor}
                    canEdit={canEditMember(m)}
                    isOwnProfile={member?.id === m.id}
                    onEditSelf={handleEditClick}
                    onEditOther={handleEditOtherMember}
                  />
                ))}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}

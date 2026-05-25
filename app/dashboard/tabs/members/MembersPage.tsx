import { MemberCard } from '@/app/components/dashboard/MemberCard'
import { QuickNavigation } from '@/app/components/dashboard/QuickNavigation'
import { SeparatorLine, SubSeparatorLine } from '@/app/components/dashboard/Separators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DashboardMember } from '@/app/components/dashboard/types'

export function MembersPage({
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
  setSearchQuery: (value: string) => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  departmentFilter: string
  setDepartmentFilter: (value: string) => void
  roleFilter: string
  setRoleFilter: (value: string) => void
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
  return (
    <div className="relative">
      <QuickNavigation
        sections={[
          { id: 'board', label: 'Board', visible: boardMembers.length > 0, color: 'yellow' },
          { id: 'core', label: 'Core', visible: coreMembers.length > 0, color: 'blue' },
          { id: 'honorary', label: 'Honorary', visible: exCoreHonorary.length > 0, color: 'amber' },
          { id: 'alumni', label: 'Alumni', visible: exCoreAlumni.length > 0, color: 'emerald' },
          { id: 'advisors', label: 'Advisors', visible: exCoreAdvisors.length > 0, color: 'indigo' },
          { id: 'others', label: 'Others', visible: exCoreOthers.length > 0 || otherMembers.length > 0, color: 'gray' },
        ]}
      />

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white">All Members</h2>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {((member?.Role === 'Board Member') || hasSpecialAccess) && (
              <Button
                onClick={handleAddMember}
                className="bg-blue-600 text-white hover:bg-blue-700 text-xs sm:text-sm"
              >
                <svg data-icon="inline-start" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Add Member</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}

          <div className="relative">
            <Input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
        </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-white/60 text-xs sm:text-sm whitespace-nowrap">Status:</label>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger size="sm" className="flex-1 sm:w-[180px] bg-black/40 border-white/20 text-white hover:bg-black/50">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueStatuses.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-white/60 text-xs sm:text-sm whitespace-nowrap">Department:</label>
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger size="sm" className="flex-1 sm:w-[220px] bg-black/40 border-white/20 text-white hover:bg-black/50">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-white/60 text-xs sm:text-sm whitespace-nowrap">Role:</label>
            <Select
              value={roleFilter}
              onValueChange={setRoleFilter}
            >
              <SelectTrigger size="sm" className="flex-1 sm:w-[180px] bg-black/40 border-white/20 text-white hover:bg-black/50">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {(statusFilter !== 'all' || departmentFilter !== 'all' || roleFilter !== 'all' || searchQuery) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setStatusFilter('all')
                setDepartmentFilter('all')
                setRoleFilter('all')
                setSearchQuery('')
              }}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              <svg data-icon="inline-start" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </Button>
          )}
        </div>

        <div className="mt-3 sm:mt-4 text-white/60 text-xs sm:text-sm">
          Showing {filteredMembers.length} of {membersVisibleByRole.length} members
        </div>
      </div>

      {boardMembers.length > 0 && (
        <div id="board" className="mb-6 sm:mb-8 scroll-mt-32">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {boardMembers.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                getPictureUrl={getPictureUrl}
                canEdit={canEditMember(m)}
                isOwnProfile={member?.id === m.id}
                onEdit={() => member?.id === m.id ? handleEditClick() : handleEditOtherMember(m)}
              />
            ))}
          </div>
        </div>
      )}

      {boardMembers.length > 0 && coreMembers.length > 0 && <SeparatorLine title="Core Members" gradient color="blue" />}

      {coreMembers.length > 0 && (
        <div id="core" className="mb-6 sm:mb-8 scroll-mt-32">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {coreMembers.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                getPictureUrl={getPictureUrl}
                canEdit={canEditMember(m)}
                isOwnProfile={member?.id === m.id}
                onEdit={() => member?.id === m.id ? handleEditClick() : handleEditOtherMember(m)}
              />
            ))}
          </div>
        </div>
      )}

      {(boardMembers.length > 0 || coreMembers.length > 0) && (exCoreHonorary.length > 0 || exCoreAlumni.length > 0 || exCoreAdvisors.length > 0 || exCoreOthers.length > 0) && (
        <SeparatorLine title="Ex-Core Members" gradient color="purple" />
      )}

      {exCoreHonorary.length > 0 && (
        <div id="honorary" className="mb-6 sm:mb-8 scroll-mt-32">
          <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 rounded-lg">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-amber-300 font-semibold text-xs sm:text-sm">Honorary Members</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {exCoreHonorary.map((m) => (
              <MemberCard key={m.id} member={m} getPictureUrl={getPictureUrl} isHonorary canEdit={canEditMember(m)} isOwnProfile={member?.id === m.id} onEdit={() => member?.id === m.id ? handleEditClick() : handleEditOtherMember(m)} />
            ))}
          </div>
        </div>
      )}

      {exCoreHonorary.length > 0 && exCoreAlumni.length > 0 && <SubSeparatorLine />}

      {exCoreAlumni.length > 0 && (
        <div id="alumni" className="mb-6 sm:mb-8 scroll-mt-32">
          <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 rounded-lg">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
              <span className="text-emerald-300 font-semibold text-xs sm:text-sm">Alumni</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {exCoreAlumni.map((m) => (
              <MemberCard key={m.id} member={m} getPictureUrl={getPictureUrl} isAlumni canEdit={canEditMember(m)} isOwnProfile={member?.id === m.id} onEdit={() => member?.id === m.id ? handleEditClick() : handleEditOtherMember(m)} />
            ))}
          </div>
        </div>
      )}

      {exCoreAlumni.length > 0 && exCoreAdvisors.length > 0 && <SubSeparatorLine />}

      {exCoreAdvisors.length > 0 && (
        <div id="advisors" className="mb-6 sm:mb-8 scroll-mt-32">
          <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border border-indigo-500/40 rounded-lg">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-indigo-300 font-semibold text-xs sm:text-sm">Advisors</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {exCoreAdvisors.map((m) => (
              <MemberCard key={m.id} member={m} getPictureUrl={getPictureUrl} isAdvisor canEdit={canEditMember(m)} isOwnProfile={member?.id === m.id} onEdit={() => member?.id === m.id ? handleEditClick() : handleEditOtherMember(m)} />
            ))}
          </div>
        </div>
      )}

      {exCoreOthers.length > 0 && (
        <div id="others" className="mb-6 sm:mb-8 scroll-mt-32">
          {(exCoreHonorary.length > 0 || exCoreAlumni.length > 0 || exCoreAdvisors.length > 0) && (
            <div className="mb-4 sm:mb-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {exCoreOthers.map((m) => (
              <MemberCard key={m.id} member={m} getPictureUrl={getPictureUrl} canEdit={canEditMember(m)} isOwnProfile={member?.id === m.id} onEdit={() => member?.id === m.id ? handleEditClick() : handleEditOtherMember(m)} />
            ))}
          </div>
        </div>
      )}

      {otherMembers.length > 0 && (
        <div className="mb-8">
          {filteredMembers.length > otherMembers.length && <SeparatorLine title="Other Members" />}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherMembers.map((m) => (
              <MemberCard key={m.id} member={m} getPictureUrl={getPictureUrl} canEdit={canEditMember(m)} isOwnProfile={member?.id === m.id} onEdit={() => member?.id === m.id ? handleEditClick() : handleEditOtherMember(m)} />
            ))}
          </div>
        </div>
      )}

      {filteredMembers.length === 0 && (
        <div className="text-center py-12 text-white/40">
          No members found matching your search.
        </div>
      )}
    </div>
  )
}

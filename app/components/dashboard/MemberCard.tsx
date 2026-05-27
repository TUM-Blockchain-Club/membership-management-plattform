 'use client'

import { memo, useCallback } from 'react'
import { EditIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { DashboardMember } from './types'

function getAvatarRingClass(
  isBoardMember: boolean,
  isHonorary: boolean,
  isAlumni: boolean,
  isAdvisor: boolean,
  isCoreMember: boolean,
) {
  if (isBoardMember) return 'ring-yellow-500/50'
  if (isHonorary)    return 'ring-amber-500/50'
  if (isAlumni)      return 'ring-emerald-500/50'
  if (isAdvisor)     return 'ring-indigo-500/50'
  if (isCoreMember)  return 'ring-blue-500/50'
  return 'ring-border'
}

function getAvatarGradientClass(
  isBoardMember: boolean,
  isHonorary: boolean,
  isAlumni: boolean,
  isAdvisor: boolean,
) {
  if (isBoardMember) return 'from-yellow-500 to-orange-600'
  if (isHonorary)    return 'from-amber-400 to-yellow-500'
  if (isAlumni)      return 'from-emerald-400 to-teal-500'
  if (isAdvisor)     return 'from-indigo-400 to-violet-500'
  return 'from-blue-500 to-purple-600'
}

function getRoleTextClass(
  isBoardMember: boolean,
  isHonorary: boolean,
  isAlumni: boolean,
  isAdvisor: boolean,
  isCoreMember: boolean,
) {
  if (isBoardMember) return 'text-yellow-400'
  if (isHonorary)    return 'text-amber-300'
  if (isAlumni)      return 'text-emerald-300'
  if (isAdvisor)     return 'text-indigo-300'
  if (isCoreMember)  return 'text-blue-400'
  return 'text-muted-foreground'
}

function getStatusBadgeClass(statusLabel: string) {
  if (statusLabel === 'Active')   return 'bg-green-500/15 border-green-500/30 text-green-400'
  if (statusLabel === 'Honorary') return 'bg-amber-500/15 border-amber-500/30 text-amber-300'
  if (statusLabel === 'Alumni')   return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
  if (statusLabel === 'Advisor')  return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
  return 'bg-white/5 border-white/15 text-muted-foreground'
}

function getDeptBadgeClass(
  isHonorary: boolean,
  isAlumni: boolean,
  isAdvisor: boolean,
) {
  if (isHonorary) return 'bg-amber-500/10 border-amber-500/20 text-amber-300'
  if (isAlumni)   return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
  if (isAdvisor)  return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
  return 'bg-white/5 border-white/10 text-muted-foreground'
}

// ── Component ─────────────────────────────────────────────────────────────

export const MemberCard = memo(function MemberCard({
  member,
  getPictureUrl,
  isHonorary = false,
  isAlumni = false,
  isAdvisor = false,
  canEdit = false,
  isOwnProfile = false,
  imageLoading = 'lazy',
  onEditSelf,
  onEditOther,
}: {
  member: DashboardMember
  getPictureUrl: (pic: unknown) => string | null
  isHonorary?: boolean
  isAlumni?: boolean
  isAdvisor?: boolean
  canEdit?: boolean
  isOwnProfile?: boolean
  imageLoading?: 'eager' | 'lazy'
  onEditSelf?: () => void
  onEditOther?: (targetMember: DashboardMember) => void
}) {
  const handleEdit = useCallback(() => {
    if (isOwnProfile) onEditSelf?.()
    else onEditOther?.(member)
  }, [isOwnProfile, onEditSelf, onEditOther, member])

  const roleLabel       = member?.Role?.trim()       || 'Member'
  const statusLabel     = member?.Status?.trim()     || ''
  const departmentLabel = member?.Department?.trim() || ''
  const emailLabel      = member?.['TBC Email']?.trim() || 'No email provided'
  const pictureUrl      = getPictureUrl(member?.Picture)

  const isBoardMember = roleLabel === 'Board Member'
  const isCoreMember  = roleLabel === 'Core Member'

  return (
    <Card
      data-member-card
      className="py-0 transition-colors duration-150 hover:bg-white/[0.02]"
    >
      <CardContent className="p-4 md:p-5">

        {/* Top-right role badge */}
        {(isBoardMember || isHonorary || isAlumni || isAdvisor) && (
          <div className="absolute top-2.5 right-2.5">
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0.5', (() => {
                if (isBoardMember) return 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                if (isHonorary)    return 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                if (isAlumni)      return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
              })())}
            >
              {isBoardMember ? 'Board' : isHonorary ? 'Honorary' : isAlumni ? 'Alumni' : 'Advisor'}
            </Badge>
          </div>
        )}

        {/* Avatar + identity */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 md:gap-4">
          <Avatar className={cn(
            'size-14 sm:size-16 md:size-20 ring-2 flex-shrink-0',
            getAvatarRingClass(isBoardMember, isHonorary, isAlumni, isAdvisor, isCoreMember),
          )}>
            {pictureUrl && (
              <AvatarImage
                src={pictureUrl}
                alt={member?.Name || 'Member'}
                decoding="async"
                loading={imageLoading}
                fetchPriority={isOwnProfile ? 'high' : 'low'}
              />
            )}
            <AvatarFallback className={cn(
              'bg-gradient-to-br text-white',
              getAvatarGradientClass(isBoardMember, isHonorary, isAlumni, isAdvisor),
            )}>
              <span className="text-lg sm:text-xl md:text-2xl font-bold">
                {member?.Name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
              </span>
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">
              {member?.Name}
            </h3>
            <p className={cn(
              'text-xs sm:text-sm font-medium truncate',
              getRoleTextClass(isBoardMember, isHonorary, isAlumni, isAdvisor, isCoreMember),
            )}>
              {roleLabel}
            </p>

            <div className="mt-1.5 flex flex-wrap gap-1 justify-center sm:justify-start">
              {statusLabel && (
                <Badge
                  variant="outline"
                  className={cn('text-[10px] sm:text-xs', getStatusBadgeClass(statusLabel))}
                >
                  {statusLabel}
                </Badge>
              )}
              {departmentLabel && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] sm:text-xs truncate max-w-full',
                    getDeptBadgeClass(isHonorary, isAlumni, isAdvisor),
                  )}
                >
                  {departmentLabel}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator className="mt-3 sm:mt-4 bg-border" />

        {/* Footer: email + edit */}
        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-2">
          <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
            <p className="text-[10px] text-muted-foreground mb-0.5">Email</p>
            <p className="text-xs sm:text-sm text-foreground truncate">{emailLabel}</p>
          </div>

          {canEdit && (onEditSelf || onEditOther) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className={cn(
                'w-full sm:w-auto sm:ml-3 text-[10px] sm:text-xs gap-1.5 border-border',
                isOwnProfile
                  ? 'text-blue-400 hover:text-blue-300 hover:border-blue-500/40 hover:bg-blue-500/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
              )}
            >
              <EditIcon className="h-3 w-3" />
              <span className="hidden sm:inline">{isOwnProfile ? 'My Profile' : 'Edit'}</span>
              <span className="sm:hidden">{isOwnProfile ? 'Me' : 'Edit'}</span>
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
  )
})

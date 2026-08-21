'use client'

import { memo, useCallback } from 'react'
import { EditIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { DashboardMember } from './types'

// ── Colour helpers (semantic where possible, role-specific where required) ─

function avatarRingClass(role: string, status: string) {
  if (role === 'Board Member') return 'ring-yellow-500/40'
  if (role === 'Core Member')  return 'ring-blue-500/40'
  if (status === 'Honorary')   return 'ring-amber-500/40'
  if (status === 'Alumni')     return 'ring-emerald-500/40'
  if (status === 'Advisor')    return 'ring-indigo-500/40'
  return 'ring-border'
}

function avatarFallbackClass(role: string, status: string) {
  if (role === 'Board Member') return 'from-yellow-500 to-orange-600'
  if (role === 'Core Member')  return 'from-blue-500 to-purple-600'
  if (status === 'Honorary')   return 'from-amber-400 to-yellow-500'
  if (status === 'Alumni')     return 'from-emerald-400 to-teal-500'
  if (status === 'Advisor')    return 'from-indigo-400 to-violet-500'
  return 'from-blue-500 to-purple-600'
}

function roleTextClass(role: string) {
  if (role === 'Board Member') return 'text-yellow-400'
  if (role === 'Core Member')  return 'text-blue-400'
  return 'text-muted-foreground'
}

function statusBadgeClass(status: string) {
  if (status === 'Active')   return 'bg-green-500/10 border-green-500/25 text-green-400'
  if (status === 'Honorary') return 'bg-amber-500/10 border-amber-500/25 text-amber-300'
  if (status === 'Alumni')   return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
  if (status === 'Advisor')  return 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300'
  return 'bg-secondary border-border text-muted-foreground'
}

// ── Component ─────────────────────────────────────────────────────────────

export const MemberCardV2 = memo(function MemberCardV2({
  member,
  getPictureUrl,
  isHonorary = false,
  isAlumni   = false,
  isAdvisor  = false,
  canEdit    = false,
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
  onEditOther?: (m: DashboardMember) => void
}) {
  const handleEdit = useCallback(() => {
    if (isOwnProfile) onEditSelf?.()
    else onEditOther?.(member)
  }, [isOwnProfile, onEditSelf, onEditOther, member])

  const roleLabel       = member?.Role?.trim()       || 'Member'
  const statusLabel     = member?.Status?.trim()     || ''
  const departmentLabel = member?.Department?.trim() || ''
  const emailLabel      = member?.['TBC Email']?.trim() || 'No email'
  const pictureUrl      = getPictureUrl(member?.Picture)
  const initials        = member?.Name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'

  const isBoardMember = roleLabel === 'Board Member'
  const isCoreMember  = roleLabel === 'Core Member'

  // Derive special label for top-right badge
  const specialLabel = isBoardMember ? 'Board'
    : isHonorary ? 'Honorary'
    : isAlumni   ? 'Alumni'
    : isAdvisor  ? 'Advisor'
    : null

  const specialBadgeClass = isBoardMember
    ? 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400'
    : isHonorary
    ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
    : isAlumni
    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
    : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300'

  return (
    <Card className="py-0 group transition-colors hover:bg-white/[0.025]">
      <CardContent className="p-4 flex flex-col gap-3">

        {/* ── Identity row ─────────────────────────────────── */}
        <div className="flex items-start gap-3 sm:gap-4">
          <Avatar className={cn('size-14 sm:size-16 md:size-20 ring-2 shrink-0', avatarRingClass(roleLabel, statusLabel))}>
            {pictureUrl && (
              <AvatarImage
                src={pictureUrl}
                alt={member?.Name || 'Member'}
                decoding="async"
                loading={imageLoading}
                fetchPriority={isOwnProfile ? 'high' : 'low'}
              />
            )}
            <AvatarFallback className={cn('bg-gradient-to-br text-foreground font-bold text-lg sm:text-xl md:text-2xl', avatarFallbackClass(roleLabel, statusLabel))}>
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5">
              <p className="text-sm sm:text-base font-semibold text-foreground truncate leading-snug flex-1">
                {member?.Name}
              </p>
              {specialLabel && (
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-px shrink-0 mt-px', specialBadgeClass)}>
                  {specialLabel}
                </Badge>
              )}
            </div>

            <p className={cn('text-xs sm:text-sm font-medium mt-0.5 truncate', roleTextClass(roleLabel))}>
              {roleLabel}
              {isCoreMember && departmentLabel ? ` · ${departmentLabel}` : ''}
            </p>

            {/* Status + dept badges (non-core only to avoid repetition) */}
            {(statusLabel || (!isCoreMember && departmentLabel)) && (
              <div className="flex flex-wrap gap-1 mt-2">
                {statusLabel && (
                  <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', statusBadgeClass(statusLabel))}>
                    {statusLabel}
                  </Badge>
                )}
                {!isCoreMember && departmentLabel && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-secondary border-border text-muted-foreground truncate max-w-[140px]">
                    {departmentLabel}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer: email + edit ──────────────────────────── */}
        <Separator />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs sm:text-sm text-muted-foreground truncate flex-1">{emailLabel}</p>
          {canEdit && (onEditSelf || onEditOther) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className={cn(
                'shrink-0 text-xs',
                isOwnProfile
                  ? 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary',
              )}
            >
              <EditIcon data-icon="inline-start" />
              {isOwnProfile ? 'My Profile' : 'Edit'}
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
  )
})

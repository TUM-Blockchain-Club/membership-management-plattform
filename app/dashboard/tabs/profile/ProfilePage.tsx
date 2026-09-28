'use client'

import { useEffect, useRef } from 'react'
import {
  ArrowLeftIcon,
  Building2Icon,
  CameraIcon,
  SaveIcon,
  ShieldCheckIcon,
  StarIcon,
  UserRoundIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { EditableProfileForm } from '@/app/components/dashboard/EditableProfileForm'
import { cn } from '@/lib/utils'
import type { Dispatch, SetStateAction } from 'react'
import type { DashboardMember, EditableMember, ProfileSection } from '@/app/components/dashboard/types'

// ── Colour helpers ────────────────────────────────────────────────────────

function avatarRingClass(role: string, status: string) {
  if (role === 'Board Member') return 'ring-yellow-500/50'
  if (role === 'Core Member')  return 'ring-blue-500/50'
  if (status === 'Honorary')   return 'ring-amber-500/50'
  if (status === 'Alumni')     return 'ring-emerald-500/50'
  if (status === 'Advisor')    return 'ring-indigo-500/50'
  return 'ring-border'
}

function avatarGradientClass(role: string, status: string) {
  if (role === 'Board Member') return 'from-yellow-500 to-orange-600'
  if (role === 'Core Member')  return 'from-blue-500 to-purple-600'
  if (status === 'Honorary')   return 'from-amber-500 to-yellow-600'
  if (status === 'Alumni')     return 'from-emerald-500 to-teal-600'
  if (status === 'Advisor')    return 'from-indigo-500 to-violet-600'
  return 'from-blue-500 to-purple-600'
}

function roleBadgeClass(role: string) {
  if (role === 'Board Member') return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
  if (role === 'Core Member')  return 'bg-blue-500/10 border-blue-500/30 text-blue-400'
  return 'bg-secondary border-border text-muted-foreground'
}

function statusBadgeClass(status: string) {
  if (status === 'Active')   return 'bg-green-500/10 border-green-500/25 text-green-400'
  if (status === 'Honorary') return 'bg-amber-500/10 border-amber-500/25 text-amber-300'
  if (status === 'Alumni')   return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
  if (status === 'Advisor')  return 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300'
  return 'bg-secondary border-border text-muted-foreground'
}

// ── Component ─────────────────────────────────────────────────────────────

export function ProfilePage({
  viewedMember,
  member,
  editedMember,
  creatingMember,
  uploadingImage,
  hasSpecialAccess,
  saving,
  canEditField,
  getPictureUrl,
  handleBackToMyProfile,
  handleSave,
  handleInputChange,
  setUploadingImage,
  setSelectedImageFile,
  setEditedMember,
}: {
  viewedMember: DashboardMember | null
  member: DashboardMember | null
  editing: boolean
  editedMember: EditableMember | null
  creatingMember: boolean
  uploadingImage: boolean
  hasSpecialAccess: boolean
  sections: ProfileSection[]
  saving: boolean
  canEditField: (fieldKey: string, isOwnProfile: boolean) => boolean
  getPictureUrl: (picture: unknown) => string | null
  handleBackToMyProfile: () => void
  handleEditClick: () => void
  handleSave: () => void
  handleCancel: () => void
  handleInputChange: (field: string, value: string | number | null) => void
  setUploadingImage: (value: boolean) => void
  setSelectedImageFile: (file: File | null) => void
  setEditedMember: Dispatch<SetStateAction<EditableMember | null>>
}) {
  // ── Initialise editable state without touching showMemberEditorModal ──
  // We deliberately bypass handleEditClick() because it always opens the
  // member-editor modal (setShowMemberEditorModal(true)).  Instead we seed
  // editedMember directly:
  //   • when the viewed member changes (navigating A → B → A)
  //   • when editedMember is cleared after a successful save
  useEffect(() => {
    if (viewedMember) setEditedMember({ ...viewedMember })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedMember?.id])

  useEffect(() => {
    if (editedMember === null && viewedMember) {
      setEditedMember({ ...viewedMember })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedMember])

  const roleLabel       = viewedMember?.Role?.trim()       || 'Member'
  const statusLabel     = viewedMember?.Status?.trim()     || ''
  const departmentLabel = viewedMember?.Department?.trim() || ''
  const isOwnProfile    = viewedMember?.id === member?.id
  const isViewingOther  = viewedMember && member && !isOwnProfile

  // Use editedMember picture if available (shows preview on image select)
  const pictureUrl = getPictureUrl(editedMember?.Picture ?? viewedMember?.Picture)
  const initials = viewedMember?.Name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2) || '?'

  // Hidden file input — triggered by the "Change photo" button
  const fileInputRef = useRef<HTMLInputElement>(null)

  const identityCard = (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <UserRoundIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <CardTitle className="text-sm font-semibold">Profile</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <Avatar className={cn('size-24 ring-2 ring-offset-2 ring-offset-background', avatarRingClass(roleLabel, statusLabel))}>
            {pictureUrl && (
              <AvatarImage src={pictureUrl} alt={viewedMember?.Name || 'Member'} />
            )}
            <AvatarFallback className={cn('bg-gradient-to-br text-2xl font-bold text-white', avatarGradientClass(roleLabel, statusLabel))}>
              {initials}
            </AvatarFallback>
          </Avatar>

          {isOwnProfile && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs"
              >
                <CameraIcon data-icon="inline-start" />
                {uploadingImage ? 'Uploading…' : 'Change photo'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploadingImage}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploadingImage(true)
                  setSelectedImageFile(file)
                  const reader = new FileReader()
                  reader.onloadend = () => {
                    setEditedMember((prev) =>
                      prev ? { ...prev, Picture: typeof reader.result === 'string' ? reader.result : null } : prev,
                    )
                    setUploadingImage(false)
                  }
                  reader.readAsDataURL(file)
                }}
              />
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col items-center pt-1 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <p className="text-base font-medium text-foreground">
              {viewedMember?.Name || 'Member'}
            </p>
            {hasSpecialAccess && isOwnProfile && (
              <Badge variant="outline" className="bg-secondary px-1.5 py-px text-[10px] text-muted-foreground">
                <ShieldCheckIcon data-icon="inline-start" />
                Admin
              </Badge>
            )}
          </div>

          <CardDescription className="mt-0.5 break-words">
            {viewedMember?.['TBC Email'] || 'No email provided'}
          </CardDescription>

          {!creatingMember && (
            <div className="mt-3 flex flex-wrap justify-center gap-1">
              <Badge variant="outline" className={cn('text-xs', roleBadgeClass(roleLabel))}>
                {roleLabel === 'Board Member' && <StarIcon data-icon="inline-start" />}
                {roleLabel}
              </Badge>
              {statusLabel && (
                <Badge variant="outline" className={cn('text-xs', statusBadgeClass(statusLabel))}>
                  {statusLabel}
                </Badge>
              )}
              {departmentLabel && (
                <Badge variant="outline" className="bg-secondary text-xs text-muted-foreground">
                  <Building2Icon data-icon="inline-start" />
                  {departmentLabel}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex flex-col gap-4">

      {/* ── Back button ─────────────────────────────────────────────── */}
      {isViewingOther && (
        <div className="mb-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToMyProfile}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon data-icon="inline-start" />
            My Profile
          </Button>
        </div>
      )}

      {editedMember ? (
        <>
          <EditableProfileForm
            member={editedMember}
            onInputChange={handleInputChange}
            onSave={handleSave}
            leadingContent={identityCard}
            layout="grid"
            isBoardMember={member?.Role === 'Board Member'}
            isOwnProfile={isOwnProfile}
            canEditField={canEditField}
          />

          <div className="flex justify-end pt-1">
            <Button onClick={handleSave} disabled={saving || uploadingImage}>
              {saving
                ? <Spinner data-icon="inline-start" />
                : <SaveIcon data-icon="inline-start" />
              }
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-12">
          <Spinner className="text-muted-foreground" />
        </div>
      )}

    </div>
  )
}

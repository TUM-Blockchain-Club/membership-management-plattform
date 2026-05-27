'use client'

import { useEffect, useRef } from 'react'
import {
  ArrowLeftIcon,
  Building2Icon,
  CameraIcon,
  SaveIcon,
  ShieldCheckIcon,
  StarIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
  editing: _editing,
  editedMember,
  creatingMember,
  uploadingImage,
  hasSpecialAccess,
  sections: _sections,
  saving,
  canEditField,
  getPictureUrl,
  handleBackToMyProfile,
  handleEditClick: _handleEditClick,
  handleSave,
  handleCancel: _handleCancel,
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

  return (
    <div>

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

      {/* ── Identity card ──────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="flex-row items-start gap-5 pb-5">

          {/* Avatar + upload button stacked */}
          <div className="flex flex-col items-start gap-2 shrink-0">
            <Avatar className={cn('size-36 ring-2 ring-offset-2 ring-offset-background', avatarRingClass(roleLabel, statusLabel))}>
              {pictureUrl && (
                <AvatarImage src={pictureUrl} alt={viewedMember?.Name || 'Member'} />
              )}
              <AvatarFallback className={cn('bg-gradient-to-br text-white font-bold text-4xl', avatarGradientClass(roleLabel, statusLabel))}>
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Explicit upload button — only shown on own profile */}
            {isOwnProfile && (
              <>
                <Button
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

          {/* Name + email + badges */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">
                {viewedMember?.Name || 'Member'}
              </CardTitle>
              {hasSpecialAccess && isOwnProfile && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-px bg-secondary border-border text-muted-foreground">
                  <ShieldCheckIcon data-icon="inline-start" />
                  Admin
                </Badge>
              )}
            </div>

            <CardDescription className="mt-0.5">
              {viewedMember?.['TBC Email'] || 'No email provided'}
            </CardDescription>

            {!creatingMember && (
              <div className="flex flex-wrap gap-1 mt-2">
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
                  <Badge variant="outline" className="text-xs bg-secondary border-border text-muted-foreground">
                    <Building2Icon data-icon="inline-start" />
                    {departmentLabel}
                  </Badge>
                )}
              </div>
            )}
          </div>

        </CardHeader>

        <Separator />

        {/* ── Form: always visible ────────────────────────────────── */}
        <CardContent className="pt-6">
          {editedMember ? (
            <>
              <EditableProfileForm
                member={editedMember}
                onInputChange={handleInputChange}
                onSave={handleSave}
                isBoardMember={member?.Role === 'Board Member'}
                isOwnProfile={isOwnProfile}
                canEditField={canEditField}
              />

              {/* Save at bottom — SCC pattern */}
              <div className="flex justify-end pt-6">
                <Button onClick={handleSave} disabled={saving}>
                  {saving
                    ? <Spinner data-icon="inline-start" />
                    : <SaveIcon data-icon="inline-start" />
                  }
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </>
          ) : (
            // Brief loading state while setEditedMember initialises
            <div className="flex items-center justify-center py-12">
              <Spinner className="text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

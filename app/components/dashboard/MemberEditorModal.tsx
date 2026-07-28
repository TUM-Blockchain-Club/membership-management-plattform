'use client'

import { useRef } from 'react'
import {
  Building2Icon,
  CameraIcon,
  SaveIcon,
  StarIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { EditableProfileForm } from '@/app/components/dashboard/EditableProfileForm'
import { cn } from '@/lib/utils'
import type { Dispatch, SetStateAction } from 'react'
import type { DashboardMember, EditableMember } from './types'

// ── Same colour helpers as ProfilePage ───────────────────────────────────────

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

// ── Props ─────────────────────────────────────────────────────────────────────

type MemberEditorModalProps = {
  open: boolean
  title: string
  viewedMember: DashboardMember | null
  member: DashboardMember | null
  editedMember: EditableMember | null
  creatingMember: boolean
  saving: boolean
  uploadingImage: boolean
  canEditField: (fieldKey: string, isOwnProfile: boolean) => boolean
  getPictureUrl: (picture: unknown) => string | null
  handleInputChange: (field: string, value: string | number | null) => void
  handleSave: () => void
  handleCancel: () => void
  setEditedMember: Dispatch<SetStateAction<EditableMember | null>>
  setUploadingImage: (value: boolean) => void
  setSelectedImageFile: (file: File | null) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MemberEditorModal({
  open,
  title,
  viewedMember,
  member,
  editedMember,
  creatingMember,
  saving,
  uploadingImage,
  canEditField,
  getPictureUrl,
  handleInputChange,
  handleSave,
  handleCancel,
  setEditedMember,
  setUploadingImage,
  setSelectedImageFile,
}: MemberEditorModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const roleLabel       = (editedMember?.Role   ?? viewedMember?.Role   ?? '').trim()
  const statusLabel     = (editedMember?.Status ?? viewedMember?.Status ?? '').trim()
  const departmentLabel = (editedMember?.Department ?? viewedMember?.Department ?? '').trim()
  const displayName     = editedMember?.Name ?? viewedMember?.Name ?? (creatingMember ? 'New Member' : 'Member')
  const isOwnProfile    = !creatingMember && viewedMember?.id === member?.id

  // Show editedMember picture for immediate preview
  const pictureUrl = getPictureUrl(editedMember?.Picture ?? viewedMember?.Picture)
  const initials   = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2) || '?'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleCancel() }}>
      <DialogContent
        className="flex flex-col h-[90vh] sm:max-w-2xl w-full gap-0 p-0 overflow-hidden"
        showCloseButton={!saving}
      >

        {/* ── Identity header ───────────────────────────────────────── */}
        <div className="shrink-0 px-6 pt-6 pb-5 border-b border-border">
          <div className="flex items-start gap-4">

            {/* Avatar + change photo button */}
            <div className="flex flex-col items-start gap-2 shrink-0">
              <Avatar className={cn(
                'size-20 ring-2 ring-offset-2 ring-offset-background',
                avatarRingClass(roleLabel, statusLabel),
              )}>
                {pictureUrl && <AvatarImage src={pictureUrl} alt={displayName} />}
                <AvatarFallback className={cn(
                  'bg-gradient-to-br text-white font-bold text-2xl',
                  avatarGradientClass(roleLabel, statusLabel),
                )}>
                  {initials}
                </AvatarFallback>
              </Avatar>

              <Button
                variant="outline"
                size="sm"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs"
              >
                {uploadingImage
                  ? <Spinner data-icon="inline-start" />
                  : <CameraIcon data-icon="inline-start" />
                }
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
                      prev
                        ? { ...prev, Picture: typeof reader.result === 'string' ? reader.result : null }
                        : prev,
                    )
                    setUploadingImage(false)
                  }
                  reader.readAsDataURL(file)
                }}
              />
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pt-1">
              <DialogTitle className="text-base leading-snug mb-0.5">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {creatingMember
                  ? 'Fill in the details for the new member.'
                  : `Editing ${viewedMember?.Name ?? 'member profile'}`
                }
              </DialogDescription>

              {!creatingMember && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {roleLabel && (
                    <Badge variant="outline" className={cn('text-xs', roleBadgeClass(roleLabel))}>
                      {roleLabel === 'Board Member' && <StarIcon data-icon="inline-start" />}
                      {roleLabel}
                    </Badge>
                  )}
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
          </div>
        </div>

        {/* ── Scrollable form ───────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <EditableProfileForm
            member={editedMember ?? {}}
            onInputChange={handleInputChange}
            onSave={handleSave}
            isBoardMember={member?.Role === 'Board Member'}
            isOwnProfile={isOwnProfile}
            canEditField={canEditField}
          />
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <DialogFooter className="shrink-0 border-t bg-muted/30 px-6 py-4">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || uploadingImage}>
            {saving
              ? <Spinner data-icon="inline-start" />
              : <SaveIcon data-icon="inline-start" />
            }
            {saving ? 'Saving…' : creatingMember ? 'Create Member' : 'Save Changes'}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}

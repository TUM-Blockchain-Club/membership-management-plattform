'use client'

import { EditableProfileForm } from '@/app/components/dashboard/EditableProfileForm'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import type { DashboardMember, EditableMember } from './types'

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
  handleInputChange: (field: string, value: string | number | null) => void
  handleSave: () => void
  handleCancel: () => void
}

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
  handleInputChange,
  handleSave,
  handleCancel,
}: MemberEditorModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) handleCancel()
    }}>
      <DialogContent
        className="z-[70] flex h-[90vh] w-full max-w-[calc(100vw-2rem)] flex-col overflow-hidden border-white/20 bg-black/90 p-0 text-white sm:max-w-5xl"
        showCloseButton={!saving}
      >
        <DialogHeader className="shrink-0 border-b border-white/10 bg-black/95 px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
          <DialogDescription className="text-xs text-white/50 sm:text-sm">
            {creatingMember ? 'Create a new member profile' : `Editing ${viewedMember?.Name ?? 'member profile'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <EditableProfileForm
            member={editedMember ?? {}}
            onInputChange={handleInputChange}
            onSave={handleSave}
            isBoardMember={member?.Role === 'Board Member'}
            isOwnProfile={!creatingMember && viewedMember?.id === member?.id}
            canEditField={canEditField}
          />
        </div>

        <DialogFooter className="shrink-0 border-t border-white/10 bg-black/95 px-4 py-4 sm:px-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
            className="border-white/20 text-white/80 hover:border-white/40 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || uploadingImage}
            className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-600/50"
          >
            {saving && <Spinner data-icon="inline-start" />}
            {saving ? 'Saving...' : creatingMember ? 'Create Member' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

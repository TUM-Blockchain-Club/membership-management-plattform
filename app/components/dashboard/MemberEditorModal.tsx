'use client'

import { EditableProfileForm } from '@/app/components/dashboard/EditableProfileForm'
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
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCancel} />

      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/20 bg-black/90 p-4 sm:p-6 shadow-2xl">
        <div className="sticky top-0 z-10 mb-4 flex items-center justify-between border-b border-white/10 bg-black/90 pb-3">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">{title}</h3>
            <p className="text-xs sm:text-sm text-white/50 mt-1">
              {creatingMember ? 'Create a new member profile' : `Editing ${viewedMember?.Name ?? 'member profile'}`}
            </p>
          </div>

          <button
            onClick={handleCancel}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs sm:text-sm text-white/70 hover:text-white hover:border-white/40"
          >
            Close
          </button>
        </div>

        <EditableProfileForm
          member={editedMember ?? {}}
          onInputChange={handleInputChange}
          onSave={handleSave}
          isBoardMember={member?.Role === 'Board Member'}
          isOwnProfile={!creatingMember && viewedMember?.id === member?.id}
          canEditField={canEditField}
        />

        <div className="sticky bottom-0 mt-4 border-t border-white/10 bg-black/90 pt-4 flex items-center justify-end gap-2">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-white/20 text-sm text-white/80 hover:text-white hover:border-white/40 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploadingImage}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-sm text-white"
          >
            {saving ? 'Saving...' : creatingMember ? 'Create Member' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

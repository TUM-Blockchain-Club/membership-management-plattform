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

      <div className="relative w-full max-w-4xl h-[90vh] rounded-2xl border border-white/20 bg-black/90 shadow-2xl flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-white/10 bg-black/95">
          <div className="flex items-center justify-between">
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
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
          <EditableProfileForm
            member={editedMember ?? {}}
            onInputChange={handleInputChange}
            onSave={handleSave}
            isBoardMember={member?.Role === 'Board Member'}
            isOwnProfile={!creatingMember && viewedMember?.id === member?.id}
            canEditField={canEditField}
          />
        </div>

        <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-white/10 bg-black/95 flex items-center justify-end gap-2">
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

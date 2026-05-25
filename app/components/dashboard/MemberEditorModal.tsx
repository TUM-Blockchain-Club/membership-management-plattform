'use client'

import Image from 'next/image'
import type { Dispatch, SetStateAction } from 'react'
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
  getPictureUrl: (picture: unknown) => string | null
  setUploadingImage: (value: boolean) => void
  setSelectedImageFile: (file: File | null) => void
  setEditedMember: Dispatch<SetStateAction<EditableMember | null>>
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
  getPictureUrl,
  setUploadingImage,
  setSelectedImageFile,
  setEditedMember,
  handleInputChange,
  handleSave,
  handleCancel,
}: MemberEditorModalProps) {
  if (!open) return null

  const pictureUrl = getPictureUrl(editedMember?.Picture ?? viewedMember?.Picture)
  const initials = (viewedMember?.Name ?? editedMember?.Name ?? '')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)

  const isOwnProfile = !creatingMember && viewedMember?.id === member?.id

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
          {/* Avatar + photo upload */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="relative">
              {pictureUrl ? (
                <Image
                  src={pictureUrl}
                  alt={viewedMember?.Name ?? 'Member'}
                  width={88}
                  height={88}
                  unoptimized
                  className="w-22 h-22 rounded-full object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-white/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{initials || '?'}</span>
                </div>
              )}
              {(isOwnProfile || !creatingMember) && (
                <label className={`absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-black cursor-pointer shadow-lg transition-colors ${uploadingImage ? 'bg-blue-600/70' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {uploadingImage ? (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setUploadingImage(true)
                      setSelectedImageFile(file)
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        const pictureValue = typeof reader.result === 'string' ? reader.result : null
                        setEditedMember((prev) => prev ? { ...prev, Picture: pictureValue } : prev)
                        setUploadingImage(false)
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-white/40">Click the camera icon to change photo</p>
          </div>

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

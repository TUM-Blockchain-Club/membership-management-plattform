import type { Dispatch, SetStateAction } from "react"
import type { DashboardMember, EditableMember, ProfileSection } from "@/app/components/dashboard/types"
import { ProfilePage } from "./profile/ProfilePage"

export function ProfileTab(props: {
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
  return <ProfilePage {...props} />
}

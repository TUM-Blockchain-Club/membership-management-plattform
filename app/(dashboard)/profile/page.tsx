'use client'

import { use } from 'react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { ProfilePage } from '@/app/dashboard/tabs/profile/ProfilePage'

export default function ProfilePageRoute() {
  const d = use(DashboardContext)!
  return (
    <ProfilePage
      viewedMember={d.viewedMember}
      member={d.member}
      editing={d.editing}
      editedMember={d.editedMember}
      creatingMember={d.creatingMember}
      uploadingImage={d.uploadingImage}
      hasSpecialAccess={d.effectiveHasSpecialAccess}
      sections={d.sections}
      saving={d.saving}
      canEditField={d.canEditField}
      getPictureUrl={d.getPictureUrl}
      handleBackToMyProfile={d.handleBackToMyProfile}
      handleEditClick={d.handleEditClick}
      handleSave={d.handleSave}
      handleCancel={d.handleCancel}
      handleInputChange={d.handleInputChange}
      setUploadingImage={d.setUploadingImage}
      setSelectedImageFile={d.setSelectedImageFile}
      setEditedMember={d.setEditedMember}
    />
  )
}

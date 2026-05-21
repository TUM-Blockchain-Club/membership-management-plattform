'use client'

import { DashboardFrame } from '@/app/dashboard/DashboardFrame'
import { ProfileTab } from '@/app/dashboard/tabs/ProfileTab'
import { useDashboardController } from '@/app/dashboard/useDashboardController'

export function ProfileDashboardRoute() {
  const dashboard = useDashboardController('profile')

  return (
    <DashboardFrame dashboard={dashboard}>
      <ProfileTab
        viewedMember={dashboard.viewedMember}
        member={dashboard.member}
        editing={dashboard.editing}
        editedMember={dashboard.editedMember}
        creatingMember={dashboard.creatingMember}
        uploadingImage={dashboard.uploadingImage}
        hasSpecialAccess={dashboard.effectiveHasSpecialAccess}
        sections={dashboard.sections}
        saving={dashboard.saving}
        canEditField={dashboard.canEditField}
        getPictureUrl={dashboard.getPictureUrl}
        handleBackToMyProfile={dashboard.handleBackToMyProfile}
        handleEditClick={dashboard.handleEditClick}
        handleSave={dashboard.handleSave}
        handleCancel={dashboard.handleCancel}
        handleInputChange={dashboard.handleInputChange}
        setUploadingImage={dashboard.setUploadingImage}
        setSelectedImageFile={dashboard.setSelectedImageFile}
        setEditedMember={dashboard.setEditedMember}
      />
    </DashboardFrame>
  )
}

'use client'

import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Spinner } from '@/components/ui/spinner'
import { DashboardFooter } from '@/app/components/dashboard/DashboardFooter'
import {
  DashboardSidebar,
  DashboardTopbar,
} from '@/app/components/dashboard/DashboardSidebar'
import type { useDashboardController } from './useDashboardController'

type DashboardController = ReturnType<typeof useDashboardController>

const MemberEditorModal = dynamic(
  () => import('@/app/components/dashboard/MemberEditorModal').then((mod) => mod.MemberEditorModal),
  { ssr: false },
)

const dashboardBackgroundAnimationEnabled =
  process.env.NEXT_PUBLIC_DASHBOARD_BACKGROUND_ANIMATION === 'true'

export function DashboardFrame({
  children,
  dashboard,
}: {
  children: ReactNode
  dashboard: DashboardController
}) {
  if (dashboard.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SidebarProvider>
        <DashboardSidebar
          member={dashboard.member}
          activeTab={dashboard.activeTab}
          onTabChange={dashboard.handleTabChange}
          onSignOut={dashboard.handleSignOut}
          onTitleClick={dashboard.handleTitleClick}
          canUseMemberViewToggle={dashboard.canUseMemberViewToggle}
          showLinkAnalyticsTab={dashboard.showLinkAnalyticsTab}
          showNewsletterTab={dashboard.showNewsletterTab}
          showNftApprovalsTab={dashboard.showNftApprovalsTab}
          forceMemberView={dashboard.forceMemberView}
          onToggleMemberView={dashboard.setForceMemberView}
          pictureUrl={dashboard.getPictureUrl(dashboard.member?.Picture)}
        />

        <SidebarInset className="min-w-0">
          <div className="fixed inset-0 grid-background pointer-events-none">
            {dashboardBackgroundAnimationEnabled && (
              <div className="absolute inset-0 grid-pattern" />
            )}
          </div>

          <DashboardTopbar activeTab={dashboard.activeTab} />

          <div className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 md:py-12">
            {dashboard.message && (
              <div className="mx-auto max-w-4xl">
                <Alert
                  variant={dashboard.message.type === 'success' ? 'default' : 'destructive'}
                  className={`mb-4 rounded-xl sm:mb-6 sm:rounded-2xl ${
                    dashboard.message.type === 'success'
                      ? 'border-green-500/30 bg-green-500/10 text-green-400'
                      : 'border-red-500/30 bg-red-500/10 text-red-400'
                  }`}
                >
                  <AlertDescription className="text-current">{dashboard.message.text}</AlertDescription>
                </Alert>
              </div>
            )}

            {children}

            {dashboard.showMemberEditorModal && (
              <MemberEditorModal
                open={dashboard.showMemberEditorModal}
                title={dashboard.creatingMember ? 'Add Member' : 'Edit Member'}
                viewedMember={dashboard.viewedMember}
                member={dashboard.member}
                editedMember={dashboard.editedMember}
                creatingMember={dashboard.creatingMember}
                saving={dashboard.saving}
                uploadingImage={dashboard.uploadingImage}
                canEditField={dashboard.canEditField}
                getPictureUrl={dashboard.getPictureUrl}
                handleInputChange={dashboard.handleInputChange}
                handleSave={dashboard.handleSave}
                handleCancel={dashboard.handleCancel}
                setEditedMember={dashboard.setEditedMember}
                setUploadingImage={dashboard.setUploadingImage}
                setSelectedImageFile={dashboard.setSelectedImageFile}
              />
            )}
          </div>

          <div className="relative z-10">
            <DashboardFooter />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

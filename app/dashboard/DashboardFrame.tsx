'use client'

import type { ReactNode } from 'react'
import { DashboardFooter, DashboardHeader, MemberEditorModal } from '@/app/components/dashboard'
import type { useDashboardController } from './useDashboardController'

type DashboardController = ReturnType<typeof useDashboardController>

export function DashboardFrame({
  children,
  dashboard,
}: {
  children: ReactNode
  dashboard: DashboardController
}) {
  if (dashboard.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 grid-background pointer-events-none">
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute inset-0 grid-glow" />
      </div>

      <div className="relative z-10">
        <DashboardHeader
          member={dashboard.member}
          activeTab={dashboard.activeTab}
          onTabChange={dashboard.handleTabChange}
          onSignOut={dashboard.handleSignOut}
          onTitleClick={dashboard.handleTitleClick}
          canUseMemberViewToggle={dashboard.canUseMemberViewToggle}
          showNftApprovalsTab={dashboard.showNftApprovalsTab}
          forceMemberView={dashboard.forceMemberView}
          onToggleMemberView={dashboard.setForceMemberView}
          onProfileTabSelected={dashboard.handleProfileTabSelected}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12">
          {dashboard.message && (
            <div className="max-w-4xl mx-auto">
              <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-sm sm:text-base ${
                dashboard.message.type === 'success'
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {dashboard.message.text}
              </div>
            </div>
          )}

          {children}

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
            handleInputChange={dashboard.handleInputChange}
            handleSave={dashboard.handleSave}
            handleCancel={dashboard.handleCancel}
          />
        </main>

        <DashboardFooter />
      </div>
    </div>
  )
}

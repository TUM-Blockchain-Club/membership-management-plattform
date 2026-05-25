'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatEventDate, formatEventTime } from '@/app/dashboard/lib/eventFormatters'
import {
  ADMIN_FIELDS,
  getEditableMemberPayload,
  getPictureUrl,
  isDashboardMemberAdmin,
  makeEmptyMember,
} from '@/app/dashboard/lib/memberUtils'
import { TAB_ROUTES } from '@/app/dashboard/lib/routes'
import { useDashboardEvents } from '@/app/dashboard/tabs/events/useDashboardEvents'
import { useMembersDirectory } from '@/app/dashboard/tabs/members/useMembersDirectory'
import { useProfileSections } from '@/app/dashboard/tabs/profile/useProfileSections'
import { useDashboardStats } from '@/app/dashboard/tabs/stats/useDashboardStats'
import { auth } from '@/lib/auth'
import { memberService } from '@/lib/members'
import { supabase } from '@/lib/supabase'
import type {
  DashboardMember,
  DashboardMessage,
  DashboardTab,
  EditableMember,
} from '@/app/components/dashboard/types'
import type { DashboardInitialData } from '@/app/dashboard/lib/initialDataTypes'

type AccessResponse = boolean | null

type DashboardControllerOptions = {
  initialData: DashboardInitialData
}

export function useDashboardController(routeTab: DashboardTab = 'profile', options: DashboardControllerOptions) {
  const router = useRouter()
  const { initialData } = options

  const [member, setMember] = useState<DashboardMember | null>(initialData.member)
  const [viewedMember, setViewedMember] = useState<DashboardMember | null>(initialData.member)
  const [allMembers, setAllMembers] = useState<DashboardMember[]>(initialData.allMembers)

  const [loading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedMember, setEditedMember] = useState<EditableMember | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [message, setMessage] = useState<DashboardMessage | null>(initialData.message)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  const [clickCount, setClickCount] = useState(0)
  const [lastClickTime, setLastClickTime] = useState(0)

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [hasSpecialAccess] = useState(initialData.hasSpecialAccess)
  const [viewedMemberHasSpecialAccess, setViewedMemberHasSpecialAccess] = useState(
    initialData.viewedMemberHasSpecialAccess
  )
  const [canManageNftRequests] = useState(initialData.canManageNftRequests)
  const [creatingMember, setCreatingMember] = useState(false)
  const [showMemberEditorModal, setShowMemberEditorModal] = useState(false)
  const [forceMemberView, setForceMemberView] = useState(false)
  const {
    events,
    handleEventRegistration,
    handleUpdateExternalEvent,
    handleUploadExternalEventImage,
    handleViewParticipants,
    modalEventTitle,
    participants,
    participantsLoading,
    savingEvent,
    setShowParticipantsModal,
    showParticipantsModal,
    uploadingEventImage,
  } = useDashboardEvents(member, setMessage, initialData.events)

  const effectiveHasSpecialAccess = hasSpecialAccess && !forceMemberView
  const effectiveIsBoardMember = member?.Role === 'Board Member' && !forceMemberView
  const showNftApprovalsTab = canManageNftRequests && !forceMemberView

  const activeTab = routeTab

  const loadViewedMemberAccess = useCallback(async (email: string | null | undefined) => {
    if (!email) {
      setViewedMemberHasSpecialAccess(false)
      return
    }

    const { data } = await supabase.rpc('check_email_has_special_access', {
      check_email: email,
    })
    setViewedMemberHasSpecialAccess((data as AccessResponse) === true)
  }, [])

  useEffect(() => {
    if (!loading && activeTab === 'nft-approvals' && !showNftApprovalsTab) {
      router.replace(TAB_ROUTES['nft-status'])
    }
  }, [activeTab, loading, router, showNftApprovalsTab])

  const handleSignOut = useCallback(async () => {
    await auth.signOut()
    router.push('/signin')
  }, [router])

  const canEditMember = useCallback((targetMember: DashboardMember) => {
    if (!member || !targetMember) return false

    if (effectiveHasSpecialAccess) return true
    if (member.id === targetMember.id) return true

    if (effectiveIsBoardMember && targetMember.Department) {
      const myDepartments = member.Department?.split(',').map((d) => d.trim()) || []
      const targetDepartments = targetMember.Department.split(',').map((d) => d.trim())

      return myDepartments.some((myDept) =>
        targetDepartments.some((targetDept) => myDept.toLowerCase() === targetDept.toLowerCase())
      )
    }

    return false
  }, [effectiveHasSpecialAccess, effectiveIsBoardMember, member])

  const canEditField = useCallback((fieldKey: string, isOwnProfile: boolean) => {
    if (fieldKey === 'TBC Email') {
      if (!effectiveHasSpecialAccess || isOwnProfile) return false
      if (viewedMemberHasSpecialAccess) return false
      return true
    }

    if (effectiveHasSpecialAccess && !isOwnProfile) return true

    if (ADMIN_FIELDS.includes(fieldKey as (typeof ADMIN_FIELDS)[number])) {
      if (effectiveHasSpecialAccess) return true
      if (effectiveIsBoardMember && !isOwnProfile) return true
      return false
    }

    return true
  }, [effectiveHasSpecialAccess, effectiveIsBoardMember, viewedMemberHasSpecialAccess])

  const triggerBlockchainEffect = useCallback(async () => {
    const { default: confetti } = await import('canvas-confetti')
    const duration = 3000
    const animationEnd = Date.now() + duration
    const colors = ['#4F46E5', '#06B6D4', '#8B5CF6', '#EC4899', '#10B981']

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
        shapes: ['square'],
        gravity: 0.8,
        scalar: 0.8,
        drift: 0.2,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
        shapes: ['square'],
        gravity: 0.8,
        scalar: 0.8,
        drift: -0.2,
      })

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame)
      }
    }

    frame()

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.4 },
      colors,
      shapes: ['square', 'circle'],
      scalar: 1.2,
    })

    setMessage({ type: 'success', text: 'You found the TBC Easter Egg!' })
    setTimeout(() => setMessage(null), 4000)
  }, [])

  const handleTitleClick = useCallback(() => {
    const now = Date.now()

    if (now - lastClickTime > 2000) {
      setClickCount(1)
      setLastClickTime(now)
      return
    }

    const newCount = clickCount + 1
    setClickCount(newCount)
    setLastClickTime(now)

    if (newCount === 10) {
      void triggerBlockchainEffect()
      setClickCount(0)
    }
  }, [clickCount, lastClickTime, triggerBlockchainEffect])

  const handleAddMember = useCallback(() => {
    setCreatingMember(true)
    setViewedMember(null)
    setEditedMember(makeEmptyMember())
    setEditing(true)
    setShowMemberEditorModal(true)
    setMessage(null)
    setSelectedImageFile(null)
  }, [])

  const handleEditClick = useCallback(async () => {
    setCreatingMember(false)
    setEditedMember(viewedMember ? { ...viewedMember } : null)
    setEditing(true)
    setShowMemberEditorModal(true)

    await loadViewedMemberAccess(viewedMember?.['TBC Email'])
  }, [loadViewedMemberAccess, viewedMember])

  const handleEditOtherMember = useCallback(async (targetMember: DashboardMember) => {
    setCreatingMember(false)
    setViewedMember(targetMember)
    setEditedMember({ ...targetMember })
    setEditing(true)
    setShowMemberEditorModal(true)

    await loadViewedMemberAccess(targetMember['TBC Email'])

    setMessage({ type: 'success', text: `Editing ${targetMember.Name || 'member'}'s profile` })
    setTimeout(() => setMessage(null), 3000)
  }, [loadViewedMemberAccess])

  const handleBackToMyProfile = useCallback(() => {
    setViewedMember(member)
    setEditing(false)
    setEditedMember(null)
    setSelectedImageFile(null)
    setViewedMemberHasSpecialAccess(false)
    setShowMemberEditorModal(false)
    router.push(TAB_ROUTES.profile)
  }, [member, router])

  const handleCancel = useCallback(() => {
    setEditing(false)
    setEditedMember(null)
    setSelectedImageFile(null)
    setViewedMemberHasSpecialAccess(false)
    setShowMemberEditorModal(false)

    if (activeTab === 'members') {
      setViewedMember(member)
      setCreatingMember(false)
    }
  }, [activeTab, member])

  const handleInputChange = useCallback((field: string, value: string | number | null) => {
    setEditedMember((prev) =>
      prev
        ? {
            ...prev,
            [field]: value === '' ? null : value,
          }
        : prev
    )
  }, [])

  const handleSave = useCallback(async () => {
    if (!editedMember) return

    setSaving(true)
    setMessage(null)

    try {
      const updatedData = getEditableMemberPayload(editedMember)

      if (selectedImageFile) {
        // reserved for future upload flow
      }

      if (creatingMember) {
        const { data: created, error } = await memberService.createMember(updatedData)
        if (error || !created) {
          setMessage({ type: 'error', text: `Failed to create member: ${error?.message || 'Unknown error'}` })
          return
        }

        setAllMembers((prev) => [created, ...prev])
        setViewedMember(created)
        setCreatingMember(false)
        setEditing(false)
        setShowMemberEditorModal(false)
        setEditedMember(null)
        setSelectedImageFile(null)
        setMessage({ type: 'success', text: 'Member created successfully!' })
        setTimeout(() => setMessage(null), 3000)
        return
      }

      if (!viewedMember) return

      const { data: updatedMember, error: updateError } = await memberService.updateMember(viewedMember.id, updatedData)
      if (updateError || !updatedMember) {
        setMessage({ type: 'error', text: `Failed to update profile: ${updateError?.message || 'Unknown error'}` })
        return
      }

      setViewedMember(updatedMember)
      if (viewedMember.id === member?.id) setMember(updatedMember)
      setAllMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)))

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setEditing(false)
      setShowMemberEditorModal(false)
      setEditedMember(null)
      setSelectedImageFile(null)
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }, [creatingMember, editedMember, member, selectedImageFile, viewedMember])

  const handleProfileTabSelected = useCallback(() => {
    setViewedMember(member)
    setEditing(false)
    setShowMemberEditorModal(false)
    setEditedMember(null)
    setCreatingMember(false)
    router.push(TAB_ROUTES.profile)
  }, [member, router])

  const handleTabChange = useCallback((tab: DashboardTab) => {
    if (tab === 'profile') {
      handleProfileTabSelected()
      return
    }

    if (tab === 'nft-approvals' && !showNftApprovalsTab) {
      router.push(TAB_ROUTES['nft-status'])
      return
    }

    router.push(TAB_ROUTES[tab])
  }, [router, showNftApprovalsTab, handleProfileTabSelected])

  const canViewRemovedMembers = effectiveIsBoardMember || effectiveHasSpecialAccess

  const {
    boardMembers,
    coreMembers,
    exCoreAdvisors,
    exCoreAlumni,
    exCoreHonorary,
    exCoreOthers,
    filteredMembers,
    membersVisibleByRole,
    otherMembers,
    uniqueDepartments,
    uniqueRoles,
    uniqueStatuses,
  } = useMembersDirectory(allMembers, canViewRemovedMembers, {
    departmentFilter,
    roleFilter,
    searchQuery,
    statusFilter,
  })

  const stats = useDashboardStats(membersVisibleByRole)

  const sections = useProfileSections(viewedMember)

  return {
    activeTab,
    boardMembers,
    canEditField,
    canEditMember,
    canManageNftRequests,
    coreMembers,
    creatingMember,
    departmentFilter,
    editedMember,
    editing,
    effectiveHasSpecialAccess,
    events,
    exCoreAdvisors,
    exCoreAlumni,
    exCoreHonorary,
    exCoreOthers,
    filteredMembers,
    formatEventDate,
    formatEventTime,
    forceMemberView,
    getPictureUrl,
    handleAddMember,
    handleBackToMyProfile,
    handleCancel,
    handleEditClick,
    handleEditOtherMember,
    handleEventRegistration,
    handleUpdateExternalEvent,
    handleUploadExternalEventImage,
    handleInputChange,
    handleProfileTabSelected,
    handleSave,
    handleSignOut,
    handleTabChange,
    handleTitleClick,
    handleViewParticipants,
    hasSpecialAccess,
    loading,
    member,
    canUseMemberViewToggle: hasSpecialAccess || isDashboardMemberAdmin(member),
    membersVisibleByRole,
    message,
    modalEventTitle,
    otherMembers,
    participants,
    participantsLoading,
    roleFilter,
    saving,
    savingEvent,
    searchQuery,
    sections,
    setDepartmentFilter,
    setEditedMember,
    setForceMemberView,
    setRoleFilter,
    setSearchQuery,
    setSelectedImageFile,
    setShowParticipantsModal,
    setStatusFilter,
    setUploadingImage,
    showMemberEditorModal,
    showNftApprovalsTab,
    showParticipantsModal,
    stats,
    statusFilter,
    uniqueDepartments,
    uniqueRoles,
    uniqueStatuses,
    uploadingImage,
    uploadingEventImage,
    viewedMember,
  }
}

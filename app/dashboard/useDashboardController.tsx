'use client'

import confetti from 'canvas-confetti'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isLocalDevBypassEnabled } from '@/lib/devBypass'
import { eventService } from '@/lib/events'
import { memberService } from '@/lib/members'
import { nftRequestService } from '@/lib/nftRequests'
import { supabase } from '@/lib/supabase'
import type {
  DashboardEvent,
  DashboardMember,
  DashboardMessage,
  DashboardParticipant,
  DashboardStats,
  DashboardTab,
  EditableMember,
  ProfileSection,
} from '@/app/components/dashboard/types'

type AccessResponse = boolean | null

const ADMIN_FIELDS = ['Role', 'Status', 'Department', 'Semester Joined', 'Active Semesters'] as const

const TAB_ROUTES: Record<DashboardTab, string> = {
  profile: '/profile',
  members: '/members',
  stats: '/statistics',
  events: '/events',
  'nft-approvals': '/nft-approvals',
  'nft-status': '/nft-status',
}

const makeEmptyMember = (): EditableMember => ({
  Name: null,
  Degree: null,
  Uni: null,
  Department: null,
  Role: null,
  Status: null,
  'Semester Joined': null,
  'Active Semesters': null,
  'TBC Email': null,
  'Private Email': null,
  Phone: null,
  Linkedin: null,
  Telegram: null,
  Discord: null,
  Instagram: null,
  Twitter: null,
  'Project/Task': null,
  'Area of Expertise': null,
  'Size Merch': null,
  Picture: null,
})

const toDisplayString = (value: unknown, fallback = 'Not specified') => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || fallback
  }
  if (value === null || value === undefined) return fallback
  if (typeof value === 'number') return String(value)
  return fallback
}

const getPictureUrl = (picture: unknown) => {
  if (!picture) return null

  if (typeof picture === 'string') {
    if (picture.startsWith('\\x')) {
      const hexString = picture.substring(2)
      let url = ''
      for (let i = 0; i < hexString.length; i += 2) {
        url += String.fromCharCode(parseInt(hexString.substring(i, i + 2), 16))
      }
      return url
    }
    return picture
  }

  if (typeof picture === 'object' && picture !== null && 'data' in picture) {
    const dataValue = (picture as { data?: unknown }).data
    if (!Array.isArray(dataValue)) {
      return null
    }

    try {
      return String.fromCharCode(...dataValue)
    } catch {
      return null
    }
  }

  return null
}

const isDashboardMemberAdmin = (member: DashboardMember | null) => {
  if (!member) return false

  const memberRecord = member as unknown as Record<string, unknown>
  return Boolean(memberRecord.is_Admin) || member.Role === 'Board Member'
}

const formatEventDate = (startAt: string, endAt: string) => {
  const start = new Date(startAt)
  const end = new Date(endAt)

  const startDate = start.toDateString()
  const endDate = end.toDateString()

  if (startDate !== endDate) {
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
    const startDay = start.getDate()
    const endDay = end.getDate()
    const year = start.getFullYear()

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`
    }

    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
  }

  return start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatEventTime = (startAt: string, endAt: string) => {
  const start = new Date(startAt)
  const end = new Date(endAt)

  const startTime = start.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const endTime = end.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return `${startTime} - ${endTime}`
}

export function useDashboardController(routeTab: DashboardTab = 'profile') {
  const router = useRouter()

  const devBypass =
    typeof window !== 'undefined' ? isLocalDevBypassEnabled(window.location.hostname) : false

  const [member, setMember] = useState<DashboardMember | null>(null)
  const [viewedMember, setViewedMember] = useState<DashboardMember | null>(null)
  const [allMembers, setAllMembers] = useState<DashboardMember[]>([])
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [participants, setParticipants] = useState<DashboardParticipant[]>([])

  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const [modalEventTitle, setModalEventTitle] = useState('')

  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editedMember, setEditedMember] = useState<EditableMember | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [message, setMessage] = useState<DashboardMessage | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  const [clickCount, setClickCount] = useState(0)
  const [lastClickTime, setLastClickTime] = useState(0)

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [hasSpecialAccess, setHasSpecialAccess] = useState(false)
  const [viewedMemberHasSpecialAccess, setViewedMemberHasSpecialAccess] = useState(false)
  const [canManageNftRequests, setCanManageNftRequests] = useState(false)
  const [creatingMember, setCreatingMember] = useState(false)
  const [showMemberEditorModal, setShowMemberEditorModal] = useState(false)
  const [forceMemberView, setForceMemberView] = useState(false)

  const effectiveHasSpecialAccess = hasSpecialAccess && !forceMemberView
  const effectiveIsBoardMember = member?.Role === 'Board Member' && !forceMemberView
  const showNftApprovalsTab = canManageNftRequests && !forceMemberView

  const activeTab = routeTab

  const loadEvents = useCallback(async (memberId?: number) => {
    const { data: eventsData, error: eventsError } = await eventService.getUpcomingEvents(memberId)
    if (eventsError || !eventsData) return
    setEvents(eventsData)
  }, [])

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
    const loadUserData = async () => {
      const { user: currentUser } = await auth.getCurrentUser()

      if (!currentUser && devBypass) {
        const { data: nftAdminAccess } = await nftRequestService.getAdminAccess()
        setMember(null)
        setViewedMember(null)
        setAllMembers([])
        setEvents([])
        setParticipants([])
        setCanManageNftRequests(nftAdminAccess === true)
        setLoading(false)
        return
      }

      if (!currentUser) {
        router.push('/signin')
        return
      }

      const { data: specialAccessResult } = await supabase.rpc('has_special_access')
      const hasLoadedSpecialAccess = (specialAccessResult as AccessResponse) === true
      setHasSpecialAccess(hasLoadedSpecialAccess)

      const { data: memberData, error: memberError } = await memberService.getMemberByEmail(currentUser.email ?? '')
      if (memberError) {
        setMessage({ type: 'error', text: `Could not load your member data: ${memberError.message || 'Please contact support.'}` })
        setLoading(false)
        return
      }

      if (!memberData) {
        setMessage({ type: 'error', text: 'No member profile found for your account.' })
        setLoading(false)
        return
      }

      setMember(memberData)
      setViewedMember(memberData)
      setCanManageNftRequests(false)

      await loadViewedMemberAccess(memberData['TBC Email'])
      const { data: nftAdminAccess } = await nftRequestService.getAdminAccess()
      setCanManageNftRequests(nftAdminAccess === true)

      const { data: allMembersData } = await memberService.getAllMembers()
      if (allMembersData) {
        setAllMembers(allMembersData)
      }

      await loadEvents(memberData.id)
      setLoading(false)
    }

    void loadUserData()
  }, [router, loadEvents, loadViewedMemberAccess, devBypass])

  useEffect(() => {
    if (activeTab === 'nft-approvals' && !showNftApprovalsTab) {
      router.replace(TAB_ROUTES['nft-status'])
    }
  }, [activeTab, router, showNftApprovalsTab])

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

  const handleEventRegistration = useCallback(async (eventId: string | number, isCurrentlyRegistered: boolean) => {
    if (!member) return

    try {
      if (isCurrentlyRegistered) {
        const { error } = await supabase
          .from('event_registrations')
          .delete()
          .eq('event_id', eventId)
          .eq('member_id', member.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('event_registrations')
          .insert({
            event_id: eventId,
            member_id: member.id,
          })

        if (error) throw error
      }

      await loadEvents(member.id)
    } catch {
      setMessage({ type: 'error', text: 'Failed to update event registration. Please try again.' })
    }
  }, [loadEvents, member])

  const handleViewParticipants = useCallback(async (eventId: string | number, title: string) => {
    setParticipantsLoading(true)
    setModalEventTitle(title)

    const { data: participantsData, error } = await eventService.getEventParticipants(eventId)
    if (error) {
      setMessage({ type: 'error', text: 'Could not load event participants.' })
      setParticipants([])
    } else {
      setParticipants(participantsData || [])
    }

    setParticipantsLoading(false)
    setShowParticipantsModal(true)
  }, [])

  const triggerBlockchainEffect = useCallback(() => {
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
      triggerBlockchainEffect()
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
      const updatedData: EditableMember = { ...editedMember }
      delete updatedData.Picture

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

  const membersVisibleByRole = useMemo(() => {
    if (canViewRemovedMembers) return allMembers
    return allMembers.filter((m) => m.Status !== 'Left' && m.Status !== 'Kicked out')
  }, [allMembers, canViewRemovedMembers])

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return membersVisibleByRole
      .filter((m) => {
        if (!query) return true
        return [m.Name, m.Department, m.Role, m['TBC Email']]
          .map((v) => v?.toLowerCase() || '')
          .some((v) => v.includes(query))
      })
      .filter((m) => statusFilter === 'all' || m.Status === statusFilter)
      .filter((m) => departmentFilter === 'all' || m.Department === departmentFilter)
      .filter((m) => roleFilter === 'all' || m.Role === roleFilter)
      .sort((a, b) => {
        const roleOrder: Record<string, number> = {
          'Board Member': 1,
          'Core Member': 2,
          'Ex-Core Member': 3,
        }

        const aOrder = roleOrder[a.Role || ''] || 99
        const bOrder = roleOrder[b.Role || ''] || 99
        if (aOrder !== bOrder) return aOrder - bOrder

        if (a.Role === 'Ex-Core Member' && b.Role === 'Ex-Core Member') {
          const statusOrder: Record<string, number> = {
            Honorary: 1,
            Alumni: 2,
            Advisor: 3,
          }
          const aStatusOrder = statusOrder[a.Status || ''] || 99
          const bStatusOrder = statusOrder[b.Status || ''] || 99
          if (aStatusOrder !== bStatusOrder) return aStatusOrder - bStatusOrder
        }

        return (a.Name || '').localeCompare(b.Name || '')
      })
  }, [departmentFilter, membersVisibleByRole, roleFilter, searchQuery, statusFilter])

  const boardMembers = useMemo(() => filteredMembers.filter((m) => m.Role === 'Board Member'), [filteredMembers])
  const coreMembers = useMemo(() => filteredMembers.filter((m) => m.Role === 'Core Member'), [filteredMembers])
  const exCoreHonorary = useMemo(() => filteredMembers.filter((m) => m.Role === 'Ex-Core Member' && m.Status === 'Honorary'), [filteredMembers])
  const exCoreAlumni = useMemo(() => filteredMembers.filter((m) => m.Role === 'Ex-Core Member' && m.Status === 'Alumni'), [filteredMembers])
  const exCoreAdvisors = useMemo(() => filteredMembers.filter((m) => m.Role === 'Ex-Core Member' && m.Status === 'Advisor'), [filteredMembers])
  const exCoreOthers = useMemo(() => filteredMembers.filter((m) => m.Role === 'Ex-Core Member' && !['Honorary', 'Alumni', 'Advisor'].includes(m.Status || '')), [filteredMembers])
  const otherMembers = useMemo(() => filteredMembers.filter((m) => !['Board Member', 'Core Member', 'Ex-Core Member'].includes(m.Role || '')), [filteredMembers])

  const uniqueStatuses = useMemo(() => [...new Set(membersVisibleByRole.map((m) => m.Status).filter((v): v is string => Boolean(v?.trim())))], [membersVisibleByRole])
  const uniqueDepartments = useMemo(() => [...new Set(membersVisibleByRole.map((m) => m.Department).filter((v): v is string => Boolean(v?.trim())))], [membersVisibleByRole])
  const uniqueRoles = useMemo(() => [...new Set(membersVisibleByRole.map((m) => m.Role).filter((v): v is string => Boolean(v?.trim())))], [membersVisibleByRole])

  const stats: DashboardStats = useMemo(() => {
    const deptSet = new Set<string>()
    membersVisibleByRole.forEach((m) => {
      if (m.Department) {
        m.Department
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean)
          .forEach((d) => deptSet.add(d))
      }
    })

    return {
      total: membersVisibleByRole.length,
      active: membersVisibleByRole.filter((m) => m.Status === 'Active').length,
      departments: deptSet.size,
      exCore: membersVisibleByRole.filter((m) => m.Role === 'Ex-Core Member').length,
    }
  }, [membersVisibleByRole])

  const sections: ProfileSection[] = useMemo(() => {
    const current = viewedMember

    return [
      {
        title: 'Personal Information',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
        fields: [
          { label: 'Full Name', value: toDisplayString(current?.Name, 'Unknown') },
          { label: 'Degree', value: toDisplayString(current?.Degree) },
          { label: 'University', value: toDisplayString(current?.Uni) },
        ],
      },
      {
        title: 'Organization',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        fields: [
          { label: 'Department', value: toDisplayString(current?.Department, 'Not assigned') },
          { label: 'Role', value: toDisplayString(current?.Role, 'Member') },
          { label: 'Status', value: toDisplayString(current?.Status, 'Unknown') },
          { label: 'Semester Joined', value: toDisplayString(current?.['Semester Joined']) },
          { label: 'Active Semesters', value: current?.['Active Semesters'] ?? 0 },
        ],
      },
      {
        title: 'Contact Information',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
        fields: [
          { label: 'TBC Email', value: toDisplayString(current?.['TBC Email'], 'No email provided') },
          { label: 'Private Email', value: toDisplayString(current?.['Private Email'], 'Not provided') },
          { label: 'Phone', value: toDisplayString(current?.Phone, 'Not provided') },
        ],
      },
      {
        title: 'Professional & Social',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        ),
        fields: [
          { label: 'LinkedIn URL', value: toDisplayString(current?.Linkedin) },
          { label: 'Telegram', value: toDisplayString(current?.Telegram) },
          { label: 'Discord', value: toDisplayString(current?.Discord) },
          { label: 'Instagram', value: toDisplayString(current?.Instagram) },
          { label: 'Twitter/X', value: toDisplayString(current?.Twitter) },
        ],
      },
      {
        title: 'Additional Details',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        fields: [
          { label: 'Current Project/Task', value: toDisplayString(current?.['Project/Task'], 'Not assigned') },
          { label: 'Area of Expertise', value: toDisplayString(current?.['Area of Expertise']) },
          { label: 'Merch Size', value: toDisplayString(current?.['Size Merch']) },
        ],
      },
    ]
  }, [viewedMember])

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
    viewedMember,
  }
}

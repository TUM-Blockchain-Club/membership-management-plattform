'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/auth'
import { memberService } from '@/lib/members'
import { eventService } from '@/lib/events'
import { supabase } from '@/lib/supabase'
import confetti from 'canvas-confetti'
import { EventsTab, MembersTab, ProfileTab, StatsTab } from './tabs'

type TabType = 'profile' | 'members' | 'stats' | 'events'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [viewedMember, setViewedMember] = useState<any>(null)
  const [allMembers, setAllMembers] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const [modalEventTitle, setModalEventTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editedMember, setEditedMember] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [clickCount, setClickCount] = useState(0)
  const [lastClickTime, setLastClickTime] = useState(0)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [hasSpecialAccess, setHasSpecialAccess] = useState(false)
  const [viewedMemberHasSpecialAccess, setViewedMemberHasSpecialAccess] = useState(false)
  const router = useRouter()
  const [creatingMember, setCreatingMember] = useState(false)

  const getPictureUrl = (picture: any) => {
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
    
    if (picture.data && Array.isArray(picture.data)) {
      try {
        return String.fromCharCode(...picture.data)
      } catch (error) {
        return null
      }
    }
    
    return null
  }

  const formatEventDate = (startAt: string, endAt: string) => {
    console.log('📅 Formatting event date:', { startAt, endAt })
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
        const result = `${startMonth} ${startDay}-${endDay}, ${year}`
        console.log('📅 Multi-day same month result:', result)
        return result
      } else {
        const result = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
        console.log('📅 Multi-day different month result:', result)
        return result
      }
    } else {
      const result = start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      console.log('📅 Single day result:', result)
      return result
    }
  }

  const formatEventTime = (startAt: string, endAt: string) => {
    console.log('🕐 Formatting event time:', { startAt, endAt })
    const start = new Date(startAt)
    const end = new Date(endAt)

    const startTime = start.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    const endTime = end.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    const result = `${startTime} - ${endTime}`
    console.log('🕐 Time result:', result)
    return result
  }

  const canEditMember = (targetMember: any) => {
    if (!member || !targetMember) return false
    
    if (hasSpecialAccess) return true
    
    if (member.id === targetMember.id) return true
    
    if (member.Role === 'Board Member' && targetMember.Department) {
      const myDepartments = member.Department?.split(',').map((d: string) => d.trim()) || []
      const targetDepartments = targetMember.Department.split(',').map((d: string) => d.trim())
      
      return myDepartments.some((myDept: string) => 
        targetDepartments.some((targetDept: string) => 
          myDept.toLowerCase() === targetDept.toLowerCase()
        )
      )
    }
    
    return false
  }

  const handleAddMember = () => {
    setCreatingMember(true)
    setViewedMember(null)
    setEditedMember(makeEmptyMember())
    setEditing(true)
    setActiveTab('profile')
    setMessage(null)
    setSelectedImageFile(null)
  }

  const makeEmptyMember = () => ({
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

  const canEditField = (fieldKey: string, isOwnProfile: boolean) => {
    if (fieldKey === 'TBC Email') {
      if (!hasSpecialAccess || isOwnProfile) return false
      if (viewedMemberHasSpecialAccess) return false
      return true
    }
    
    if (hasSpecialAccess && !isOwnProfile) return true
    
    const adminFields = ['Role', 'Status', 'Department', 'Semester Joined', 'Active Semesters']
    
    if (adminFields.includes(fieldKey)) {
      if (hasSpecialAccess) return true
      if (member?.Role === 'Board Member' && !isOwnProfile) return true
      return false
    }
    
    return true
  }

  useEffect(() => {
    // make sure modal doesn't hang open when user switches tabs
    if (activeTab !== 'events') {
      setShowParticipantsModal(false)
    }

    const loadUserData = async () => {
      const { user: currentUser } = await auth.getCurrentUser()
      
      if (!currentUser) {
        router.push('/signin')
        return
      }

      setUser(currentUser)
      
      const { data: specialAccessResult } = await supabase.rpc('has_special_access')
      setHasSpecialAccess(specialAccessResult === true)
      
      const { data: memberData, error: memberError } = await memberService.getMemberByEmail(currentUser.email!)
      
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

      const { data: allMembersData } = await memberService.getAllMembers()
      if (allMembersData) {
        setAllMembers(allMembersData)
      }

      console.log('📅 Dashboard: Fetching events data...')
      const { data: eventsData, error: eventsError } = await eventService.getUpcomingEvents(memberData.id)
      if (eventsError) {
        console.error('❌ Dashboard: Failed to fetch events:', eventsError)
      } else if (eventsData) {
        console.log('✅ Dashboard: Events loaded successfully:', eventsData.length, 'events')
        setEvents(eventsData)
      } else {
        console.log('⚠️ Dashboard: No events data received')
      }
      
      setLoading(false)
    }

    loadUserData()
  }, [router])

  const handleSignOut = async () => {
    await auth.signOut()
    router.push('/signin')
  }

  const handleEventRegistration = async (eventId: string | number, isCurrentlyRegistered: boolean) => {
    console.log('🎯 handleEventRegistration called:', { eventId, isCurrentlyRegistered, memberId: member?.id })
    if (!member) {
      console.error('❌ No member data available')
      return
    }

    try {
      if (isCurrentlyRegistered) {
        console.log('📤 Unregistering from event:', eventId)
        const { error } = await supabase
          .from('event_registrations')
          .delete()
          .eq('event_id', eventId)
          .eq('member_id', member.id)

        if (error) {
          console.error('❌ Delete error:', error)
          throw error
        }
        console.log('✅ Unregistered from event:', eventId)
      } else {
        console.log('📥 Registering for event:', eventId, 'with member_id:', member.id)
        const { error } = await supabase
          .from('event_registrations')
          .insert({
            event_id: eventId,
            member_id: member.id
          })

        if (error) {
          console.error('❌ Insert error:', error)
          throw error
        }
        console.log('✅ Registered for event:', eventId)
      }

      console.log('🔄 Refreshing events data...')
      const { data: updatedEvents } = await eventService.getUpcomingEvents(member.id)
      if (updatedEvents) {
        setEvents(updatedEvents)
        console.log('✅ Events data refreshed')
      } else {
        console.log('⚠️ No updated events data received')
      }
    } catch (error) {
      console.error('❌ Event registration error:', error)
      setMessage({ type: 'error', text: 'Failed to update event registration. Please try again.' })
    }
  }

  const handleViewParticipants = async (eventId: string | number, title: string) => {
    console.log('👥 Loading participants for event', eventId)
    setParticipantsLoading(true)
    setModalEventTitle(title)

    const { data: participantsData, error } = await eventService.getEventParticipants(eventId)
    if (error) {
      console.error('❌ Failed to fetch participants via service:', error)
      setMessage({ type: 'error', text: 'Could not load event participants.' })
      setParticipants([])
    } else {
      setParticipants(participantsData || [])
    }

    setParticipantsLoading(false)
    setShowParticipantsModal(true)
  }

  const triggerBlockchainEffect = () => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const colors = ['#4F46E5', '#06B6D4', '#8B5CF6', '#EC4899', '#10B981']
    
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: colors,
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
        colors: colors,
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
      colors: colors,
      shapes: ['square', 'circle'],
      scalar: 1.2,
    })
    
    setMessage({ type: 'success', text: 'You found the TBC Easter Egg!' })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleTitleClick = () => {
    const now = Date.now()
    
    if (now - lastClickTime > 2000) {
      setClickCount(1)
    } else {
      const newCount = clickCount + 1
      setClickCount(newCount)
      
      if (newCount === 10) {
        triggerBlockchainEffect()
        setClickCount(0)
      }
    }
    
    setLastClickTime(now)
  }

  const handleEditClick = async () => {
    setEditedMember({ ...viewedMember })
    setEditing(true)
    setActiveTab('profile')
    
    if (viewedMember && viewedMember['TBC Email']) {
      const { data } = await supabase.rpc('check_email_has_special_access', {
        check_email: viewedMember['TBC Email']
      })
      setViewedMemberHasSpecialAccess(data === true)
    }
  }

  const handleEditOtherMember = async (targetMember: any) => {
    setViewedMember(targetMember)
    setEditedMember({ ...targetMember })
    setEditing(true)
    setActiveTab('profile')
    
    if (targetMember && targetMember['TBC Email']) {
      const { data } = await supabase.rpc('check_email_has_special_access', {
        check_email: targetMember['TBC Email']
      })
      setViewedMemberHasSpecialAccess(data === true)
    }
    
    setMessage({ 
      type: 'success', 
      text: `Editing ${targetMember.Name}'s profile` 
    })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleBackToMyProfile = () => {
    setViewedMember(member)
    setEditing(false)
    setEditedMember(null)
    setSelectedImageFile(null)
    setViewedMemberHasSpecialAccess(false)
    setActiveTab('profile')
  }

  const handleCancel = () => {
    setEditing(false)
    setEditedMember(null)
    setSelectedImageFile(null)
    setViewedMemberHasSpecialAccess(false)
  }

  const handleInputChange = (field: string, value: any) => {
    setEditedMember((prev: any) => ({
      ...prev,
      [field]: value === '' ? null : value
    }))
  }

const handleSave = async () => {
  setSaving(true)
  setMessage(null)

  try {
    const updatedData = { ...editedMember }
    delete updatedData.Picture

    if (selectedImageFile) {
    }

    if (creatingMember) {
      const { data: created, error } = await memberService.createMember(updatedData)
      if (error) {
        setMessage({ type: 'error', text: `Failed to create member: ${error.message}` })
        return
      }

      setAllMembers(prev => [created, ...prev])
      setViewedMember(created)
      setCreatingMember(false)
      setEditing(false)
      setEditedMember(null)
      setSelectedImageFile(null)
      setMessage({ type: 'success', text: 'Member created successfully!' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const { data: updatedMember, error: updateError } =
      await memberService.updateMember(viewedMember.id, updatedData)

    if (updateError) {
      setMessage({ type: 'error', text: `Failed to update profile: ${updateError.message}` })
      return
    }

    setViewedMember(updatedMember)
    if (viewedMember.id === member.id) setMember(updatedMember)
    setAllMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m))

    setMessage({ type: 'success', text: 'Profile updated successfully!' })
    setEditing(false)
    setEditedMember(null)
    setSelectedImageFile(null)
    setTimeout(() => setMessage(null), 3000)
  } finally {
    setSaving(false)
  }
}

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  const canViewRemovedMembers = member?.Role === 'Board Member' || hasSpecialAccess
  const membersVisibleByRole = canViewRemovedMembers
    ? allMembers
    : allMembers.filter((m) => m.Status !== 'Left' && m.Status !== 'Kicked out')

  const filteredMembers = membersVisibleByRole.filter(m => 
    m.Name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.Department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.Role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m['TBC Email']?.toLowerCase().includes(searchQuery.toLowerCase())
  ).filter(m => 
    statusFilter === 'all' || m.Status === statusFilter
  ).filter(m => 
    departmentFilter === 'all' || m.Department === departmentFilter
  ).filter(m => 
    roleFilter === 'all' || m.Role === roleFilter
  ).sort((a, b) => {
    const roleOrder: Record<string, number> = {
      'Board Member': 1,
      'Core Member': 2,
      'Ex-Core Member': 3
    }
    const aOrder = roleOrder[a.Role] || 99
    const bOrder = roleOrder[b.Role] || 99
    if (aOrder !== bOrder) return aOrder - bOrder
    
    // For Ex-Core Members, sort by status (Honorary -> Alumni -> Advisor -> Others)
    if (a.Role === 'Ex-Core Member' && b.Role === 'Ex-Core Member') {
      const statusOrder: Record<string, number> = {
        'Honorary': 1,
        'Alumni': 2,
        'Advisor': 3,
      }
      const aStatusOrder = statusOrder[a.Status] || 99
      const bStatusOrder = statusOrder[b.Status] || 99
      if (aStatusOrder !== bStatusOrder) return aStatusOrder - bStatusOrder
    }
    
    return (a.Name || '').localeCompare(b.Name || '')
  })

  const boardMembers = filteredMembers.filter(m => m.Role === 'Board Member')
  const coreMembers = filteredMembers.filter(m => m.Role === 'Core Member')
  const exCoreHonorary = filteredMembers.filter(m => m.Role === 'Ex-Core Member' && m.Status === 'Honorary')
  const exCoreAlumni = filteredMembers.filter(m => m.Role === 'Ex-Core Member' && m.Status === 'Alumni')
  const exCoreAdvisors = filteredMembers.filter(m => m.Role === 'Ex-Core Member' && m.Status === 'Advisor')
  const exCoreOthers = filteredMembers.filter(m => m.Role === 'Ex-Core Member' && m.Status !== 'Honorary' && m.Status !== 'Alumni' && m.Status !== 'Advisor')
  const otherMembers = filteredMembers.filter(m => m.Role !== 'Board Member' && m.Role !== 'Core Member' && m.Role !== 'Ex-Core Member')

  const uniqueStatuses = [...new Set(membersVisibleByRole.map(m => m.Status).filter(Boolean))]
  const uniqueDepartments = [...new Set(membersVisibleByRole.map(m => m.Department).filter(Boolean))]
  const uniqueRoles = [...new Set(membersVisibleByRole.map(m => m.Role).filter(Boolean))]

  const stats = {
    total: membersVisibleByRole.length,
    active: membersVisibleByRole.filter(m => m.Status === 'Active').length,
    departments: (() => {
      const deptSet = new Set<string>()
      membersVisibleByRole.forEach(m => {
        if (m.Department) {
          m.Department.split(',').forEach((d: string) => {
            const dept = d.trim()
            if (dept) deptSet.add(dept)
          })
        }
      })
      return deptSet.size
    })(),
    exCore: membersVisibleByRole.filter(m => m.Role === 'Ex-Core Member').length
  }

  const sections = [
    {
      title: 'Personal Information',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      fields: [
        { label: 'Full Name', value: viewedMember?.Name },
        { label: 'Degree', value: viewedMember?.Degree || 'Not specified' },
        { label: 'University', value: viewedMember?.Uni || 'Not specified' }
      ]
    },
    {
      title: 'Organization',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      fields: [
        { label: 'Department', value: viewedMember?.Department || 'Not assigned' },
        { label: 'Role', value: viewedMember?.Role },
        { label: 'Status', value: viewedMember?.Status },
        { label: 'Semester Joined', value: viewedMember?.['Semester Joined'] || 'Not specified' },
        { label: 'Active Semesters', value: viewedMember?.['Active Semesters'] || '0' }
      ]
    },
    {
      title: 'Contact Information',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      fields: [
        { label: 'TBC Email', value: viewedMember?.['TBC Email'] },
        { label: 'Private Email', value: viewedMember?.['Private Email'] || 'Not provided' },
        { label: 'Phone', value: viewedMember?.Phone || 'Not provided' }
      ]
    },
    {
      title: 'Professional & Social',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      fields: [
        { key: 'Linkedin', label: 'LinkedIn URL', type: 'url', placeholder: 'https://www.linkedin.com/in/john-doe' },
        { key: 'Telegram', label: 'Telegram', type: 'text', placeholder: 'john_doe' },
        { key: 'Discord', label: 'Discord', type: 'text', placeholder: 'john_doe#1234' },
        { key: 'Instagram', label: 'Instagram', type: 'text', placeholder: 'john_doe' },
        { key: 'Twitter', label: 'Twitter/X', type: 'text', placeholder: 'john_doe' }
      ]
    },
    {
      title: 'Additional Details',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      fields: [
        { label: 'Current Project/Task', value: viewedMember?.['Project/Task'] || 'Not assigned' },
        { label: 'Area of Expertise', value: viewedMember?.['Area of Expertise'] || 'Not specified' },
        { label: 'Merch Size', value: viewedMember?.['Size Merch'] || 'Not specified' }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 grid-background pointer-events-none">
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute inset-0 grid-glow" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <h1 
                className="inline-block transform-gpu origin-left text-2xl sm:text-3xl font-bold text-white cursor-default select-none transition-transform duration-200 hover:scale-105 truncate"
                onClick={handleTitleClick}
              >
                Dashboard
              </h1>
              <p className="text-white/60 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">Welcome back, {member?.Name?.split(' ')[0]}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 sm:px-6 py-2 text-xs sm:text-sm text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg transition-all duration-200 whitespace-nowrap"
            >
              Sign Out
            </button>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 sm:pb-4">
            <nav className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
              <button
                onClick={() => {
                  setActiveTab('profile')
                  setViewedMember(member)
                  setEditing(false)
                  setEditedMember(null)
                }}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'profile'
                    ? 'bg-blue-600 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden sm:inline">My Profile</span>
                  <span className="sm:hidden">Profile</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'members'
                    ? 'bg-blue-600 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="hidden sm:inline">All Members</span>
                  <span className="sm:hidden">Members</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'stats'
                    ? 'bg-blue-600 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="hidden sm:inline">Statistics</span>
                  <span className="sm:hidden">Stats</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'events'
                    ? 'bg-blue-600 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Events
                </div>
              </button>
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12">
          {message && (
            <div className="max-w-4xl mx-auto">
              <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-sm sm:text-base ${
                message.type === 'success' 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {message.text}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <ProfileTab
              viewedMember={viewedMember}
              member={member}
              editing={editing}
              editedMember={editedMember}
              creatingMember={creatingMember}
              uploadingImage={uploadingImage}
              hasSpecialAccess={hasSpecialAccess}
              sections={sections}
              saving={saving}
              canEditField={canEditField}
              getPictureUrl={getPictureUrl}
              handleBackToMyProfile={handleBackToMyProfile}
              handleEditClick={handleEditClick}
              handleSave={handleSave}
              handleCancel={handleCancel}
              handleInputChange={handleInputChange}
              setUploadingImage={setUploadingImage}
              setSelectedImageFile={setSelectedImageFile}
              setEditedMember={setEditedMember}
            />
          )}

          {activeTab === 'members' && (
            <MembersTab
              boardMembers={boardMembers}
              coreMembers={coreMembers}
              exCoreHonorary={exCoreHonorary}
              exCoreAlumni={exCoreAlumni}
              exCoreAdvisors={exCoreAdvisors}
              exCoreOthers={exCoreOthers}
              otherMembers={otherMembers}
              member={member}
              hasSpecialAccess={hasSpecialAccess}
              handleAddMember={handleAddMember}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              departmentFilter={departmentFilter}
              setDepartmentFilter={setDepartmentFilter}
              roleFilter={roleFilter}
              setRoleFilter={setRoleFilter}
              uniqueStatuses={uniqueStatuses}
              uniqueDepartments={uniqueDepartments}
              uniqueRoles={uniqueRoles}
              filteredMembers={filteredMembers}
              membersVisibleByRole={membersVisibleByRole}
              getPictureUrl={getPictureUrl}
              canEditMember={canEditMember}
              handleEditClick={handleEditClick}
              handleEditOtherMember={handleEditOtherMember}
            />
          )}

          {activeTab === 'stats' && (
            <StatsTab stats={stats} membersVisibleByRole={membersVisibleByRole} />
          )}

          {activeTab === 'events' && (
            <EventsTab
              events={events}
              formatEventDate={formatEventDate}
              formatEventTime={formatEventTime}
              handleEventRegistration={handleEventRegistration}
              member={member}
              hasSpecialAccess={hasSpecialAccess}
              handleViewParticipants={handleViewParticipants}
              showParticipantsModal={showParticipantsModal}
              modalEventTitle={modalEventTitle}
              participants={participants}
              participantsLoading={participantsLoading}
              setShowParticipantsModal={setShowParticipantsModal}
            />
          )}
        </main>
      </div>
    </div>
  )
}

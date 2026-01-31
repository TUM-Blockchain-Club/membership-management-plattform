'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/auth'
import { memberService } from '@/lib/members'
import { eventService } from '@/lib/events'
import { supabase } from '@/lib/supabase'
import confetti from 'canvas-confetti'
import UniversityAutocomplete from '@/app/components/UniversityAutocomplete'

type TabType = 'profile' | 'members' | 'stats' | 'events'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [viewedMember, setViewedMember] = useState<any>(null)
  const [allMembers, setAllMembers] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
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

    // Check if it's a multi-day event
    const startDate = start.toDateString()
    const endDate = end.toDateString()

    if (startDate !== endDate) {
      // Multi-day event
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
      // Single day event
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
        // Unregister from event
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
        // Register for event
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

      // Refresh events data
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

    // optional image upload (only if user selected an image)
    if (selectedImageFile) {
      // If creating, you may not have an id yet -> upload after insert OR use email as key
      // simplest: insert first, then upload using returned id
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

    // existing edit (your current logic)
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

  const filteredMembers = allMembers.filter(m => 
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

  // Group members by role and status for display
  const boardMembers = filteredMembers.filter(m => m.Role === 'Board Member')
  const coreMembers = filteredMembers.filter(m => m.Role === 'Core Member')
  const exCoreHonorary = filteredMembers.filter(m => m.Role === 'Ex-Core Member' && m.Status === 'Honorary')
  const exCoreAlumni = filteredMembers.filter(m => m.Role === 'Ex-Core Member' && m.Status === 'Alumni')
  const exCoreAdvisors = filteredMembers.filter(m => m.Role === 'Ex-Core Member' && m.Status === 'Advisor')
  const exCoreOthers = filteredMembers.filter(m => m.Role === 'Ex-Core Member' && m.Status !== 'Honorary' && m.Status !== 'Alumni' && m.Status !== 'Advisor')
  const otherMembers = filteredMembers.filter(m => m.Role !== 'Board Member' && m.Role !== 'Core Member' && m.Role !== 'Ex-Core Member')

  const uniqueStatuses = [...new Set(allMembers.map(m => m.Status).filter(Boolean))]
  const uniqueDepartments = [...new Set(allMembers.map(m => m.Department).filter(Boolean))]
  const uniqueRoles = [...new Set(allMembers.map(m => m.Role).filter(Boolean))]

  const stats = {
    total: allMembers.length,
    active: allMembers.filter(m => m.Status === 'Active').length,
    departments: (() => {
      const deptSet = new Set<string>()
      allMembers.forEach(m => {
        if (m.Department) {
          m.Department.split(',').forEach((d: string) => {
            const dept = d.trim()
            if (dept) deptSet.add(dept)
          })
        }
      })
      return deptSet.size
    })(),
    exCore: allMembers.filter(m => m.Role === 'Ex-Core Member').length
  }

  // Helper functions for formatting profile data
  const formatLink = (url: string | null, platform: string) => {
    if (!url) return <span className="text-white/40">Not provided</span>;
    return (
      <a
        href={url.startsWith('http') ? url : `https://${url}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 group"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        <span className="group-hover:underline">{platform}</span>
      </a>
    );
  };

  const formatUsername = (username: string | null, platform: string) => {
    if (!username) return <span className="text-white/40">Not provided</span>;
    return <span className="text-white">@{username}</span>;
  };

  // Profile sections for display
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
          <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
            <div>
              <h1 
                className="text-3xl font-bold text-white cursor-default select-none transition-transform duration-200 hover:scale-105"
                onClick={handleTitleClick}
              >
                Dashboard
              </h1>
              <p className="text-white/60 text-sm mt-1">Welcome back, {member?.Name?.split(' ')[0]}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-6 py-2 text-sm text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg transition-all duration-200"
            >
              Sign Out
            </button>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 pb-4">
            <nav className="flex gap-2">
              <button
                onClick={() => {
                  setActiveTab('profile')
                  setViewedMember(member)
                  setEditing(false)
                  setEditedMember(null)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'profile'
                    ? 'bg-blue-600 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Profile
                </div>
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'members'
                    ? 'bg-blue-600 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  All Members
                </div>
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'stats'
                    ? 'bg-blue-600 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Statistics
                </div>
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'events'
                    ? 'bg-blue-600 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Events
                </div>
              </button>
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-12">
          {message && (
            <div className="max-w-4xl mx-auto">
              <div className={`mb-6 p-4 rounded-2xl border ${
                message.type === 'success' 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {message.text}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-4xl mx-auto">
              {/* Back to My Profile button - shown when editing another member */}
              {viewedMember && member && viewedMember.id !== member.id && (
                <div className="mb-4">
                  <button
                    onClick={handleBackToMyProfile}
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-300 hover:text-blue-200 transition-all duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to My Profile
                  </button>
                </div>
              )}
              
              <div className={`backdrop-blur-md border rounded-2xl p-8 mb-8 relative overflow-hidden ${
                viewedMember?.Role === 'Board Member'
                  ? 'bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-yellow-500/10 border-yellow-500/30'
                  : viewedMember?.Role === 'Core Member'
                  ? 'bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-blue-500/10 border-blue-500/30'
                  : viewedMember?.Status === 'Honorary'
                  ? 'bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-500/10 border-amber-500/30'
                  : viewedMember?.Status === 'Alumni'
                  ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/10 border-emerald-500/30'
                  : viewedMember?.Status === 'Advisor'
                  ? 'bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-indigo-500/10 border-indigo-500/30'
                  : 'bg-white/5 border-white/10'
              }`}>
                {/* Decorative corner accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 opacity-20 blur-3xl ${
                  viewedMember?.Role === 'Board Member'
                    ? 'bg-yellow-500'
                    : viewedMember?.Role === 'Core Member'
                    ? 'bg-blue-500'
                    : viewedMember?.Status === 'Honorary'
                    ? 'bg-amber-500'
                    : viewedMember?.Status === 'Alumni'
                    ? 'bg-emerald-500'
                    : viewedMember?.Status === 'Advisor'
                    ? 'bg-indigo-500'
                    : 'bg-purple-500'
                }`} />
                
            <div className="flex items-start gap-6 relative z-10">
              <div className="flex-shrink-0">
                <div className="relative group">
                  {getPictureUrl(editing && editedMember ? editedMember.Picture : viewedMember?.Picture) ? (
                    <img 
                      src={getPictureUrl(editing && editedMember ? editedMember.Picture : viewedMember?.Picture) || ''}
                      alt={viewedMember?.Name}
                      className={`w-24 h-24 rounded-full object-cover border-2 ${
                        viewedMember?.Role === 'Board Member'
                          ? 'border-yellow-500/50'
                          : viewedMember?.Role === 'Core Member'
                          ? 'border-blue-500/50'
                          : viewedMember?.Status === 'Honorary'
                          ? 'border-amber-500/50'
                          : viewedMember?.Status === 'Alumni'
                          ? 'border-emerald-500/50'
                          : viewedMember?.Status === 'Advisor'
                          ? 'border-indigo-500/50'
                          : 'border-white/20'
                      }`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center border-2 ${
                    viewedMember?.Role === 'Board Member'
                      ? 'bg-gradient-to-br from-yellow-500 to-orange-600 border-yellow-500/50'
                      : viewedMember?.Role === 'Core Member'
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-blue-500/50'
                      : viewedMember?.Status === 'Honorary'
                      ? 'bg-gradient-to-br from-amber-500 to-yellow-600 border-amber-500/50'
                      : viewedMember?.Status === 'Alumni'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-500/50'
                      : viewedMember?.Status === 'Advisor'
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-500/50'
                      : 'bg-gradient-to-br from-blue-500 to-purple-600 border-white/20'
                  } ${getPictureUrl(editing && editedMember ? editedMember.Picture : viewedMember?.Picture) ? 'hidden' : ''}`}>
                    <span className="text-3xl font-bold text-white">
                      {viewedMember?.Name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  
                  {editing && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingImage ? (
                        <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            setEditedMember((prev: any) => ({
                              ...prev,
                              Picture: reader.result
                            }))
                            setUploadingImage(false)
                          }
                          reader.readAsDataURL(file)
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-1">
                  <h2 className="text-2xl font-bold text-white">{viewedMember?.Name}</h2>
                  <div className="flex items-center gap-2">
                    {hasSpecialAccess && viewedMember?.id === member?.id && (
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border backdrop-blur-sm ${
                        viewedMember?.Role === 'Board Member'
                          ? 'bg-yellow-500/30 border-yellow-400/60'
                          : viewedMember?.Role === 'Core Member'
                          ? 'bg-blue-500/30 border-blue-400/60'
                          : 'bg-purple-500/30 border-purple-400/60'
                      }`}>
                        <svg className={`w-3.5 h-3.5 ${
                          viewedMember?.Role === 'Board Member'
                            ? 'text-yellow-300'
                            : viewedMember?.Role === 'Core Member'
                            ? 'text-blue-300'
                            : 'text-purple-300'
                        }`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className={`text-xs font-semibold ${
                          viewedMember?.Role === 'Board Member'
                            ? 'text-yellow-200'
                            : viewedMember?.Role === 'Core Member'
                            ? 'text-blue-200'
                            : 'text-purple-200'
                        }`}>Admin</span>
                      </div>
                    )}
                    {viewedMember?.Role === 'Board Member' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-lg">
                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-yellow-300 text-xs font-semibold">Board</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-white/60 text-sm mb-3">{viewedMember?.['TBC Email']}</p>
                
                {!creatingMember && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${
                  viewedMember?.Role === 'Board Member'
                    ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
                    : viewedMember?.Role === 'Core Member'
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                }`}>
                  {viewedMember?.Role}
                </span>

                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${
                  viewedMember?.Status === 'Active' 
                    ? 'bg-green-500/20 border-green-500/40 text-green-300'
                    : viewedMember?.Status === 'Honorary'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : viewedMember?.Status === 'Alumni'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : viewedMember?.Status === 'Advisor'
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-gray-500/20 border-gray-500/40 text-gray-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    viewedMember?.Status === 'Active' 
                      ? 'bg-green-400 shadow-lg shadow-green-400/50'
                      : viewedMember?.Status === 'Honorary'
                      ? 'bg-amber-400 shadow-lg shadow-amber-400/50'
                      : viewedMember?.Status === 'Alumni'
                      ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                      : viewedMember?.Status === 'Advisor'
                      ? 'bg-indigo-400 shadow-lg shadow-indigo-400/50'
                      : 'bg-gray-400'
                  }`} />
                  {viewedMember?.Status}
                </span>

                {viewedMember?.Department && (
                  <span className="inline-flex items-center px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white/80 text-sm font-medium">
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {viewedMember?.Department}
                  </span>
                )}
              </div>
            )}

              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <div className="border-b border-white/10 px-8 py-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Profile Information</h3>
              <div className="flex gap-3">
                {!editing ? (
                  <button
                    onClick={handleEditClick}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-all duration-200 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="p-8">
              {editing ? (
                <EditableProfileForm
                  member={editedMember}
                  onInputChange={handleInputChange}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  saving={saving}
                  hasSpecialAccess={hasSpecialAccess}
                  isBoardMember={member?.Role === 'Board Member'}
                  isOwnProfile={viewedMember?.id === member?.id}
                  canEditField={canEditField}
                />
              ) : (
                <ProfileDisplay member={viewedMember} sections={sections} />
              )}
            </div>
          </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="relative">
              {/* Floating Quick Navigation */}
              <QuickNavigation 
                sections={[
                  { id: 'board', label: 'Board', visible: boardMembers.length > 0, color: 'yellow' },
                  { id: 'core', label: 'Core', visible: coreMembers.length > 0, color: 'blue' },
                  { id: 'honorary', label: 'Honorary', visible: exCoreHonorary.length > 0, color: 'amber' },
                  { id: 'alumni', label: 'Alumni', visible: exCoreAlumni.length > 0, color: 'emerald' },
                  { id: 'advisors', label: 'Advisors', visible: exCoreAdvisors.length > 0, color: 'indigo' },
                  { id: 'others', label: 'Others', visible: exCoreOthers.length > 0 || otherMembers.length > 0, color: 'gray' },
                ]}
              />
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">All Members</h2>

                  {/* RIGHT SIDE: button + search */}
                  <div className="flex items-center gap-3">
                    {member?.Role === 'Board Member' && (
                      <button
                        onClick={handleAddMember}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-all duration-200 flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Add Member
                      </button>
                    )}

                    {/* existing search box */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                      />
                      <svg
                        className="w-5 h-5 text-white/40 absolute left-3 top-2.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-white/60 text-sm">Status:</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-1.5 bg-black/40 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-black/50 transition-colors"
                    >
                      <option value="all" className="bg-gray-900 text-white">All Statuses</option>
                      {uniqueStatuses.map(status => (
                        <option key={status} value={status} className="bg-gray-900 text-white">{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-white/60 text-sm">Department:</label>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="px-3 py-1.5 bg-black/40 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-black/50 transition-colors"
                    >
                      <option value="all" className="bg-gray-900 text-white">All Departments</option>
                      {uniqueDepartments.map(dept => (
                        <option key={dept} value={dept} className="bg-gray-900 text-white">{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-white/60 text-sm">Role:</label>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-3 py-1.5 bg-black/40 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-black/50 transition-colors"
                    >
                      <option value="all" className="bg-gray-900 text-white">All Roles</option>
                      {uniqueRoles.map(role => (
                        <option key={role} value={role} className="bg-gray-900 text-white">{role}</option>
                      ))}
                    </select>
                  </div>

                  {(statusFilter !== 'all' || departmentFilter !== 'all' || roleFilter !== 'all' || searchQuery) && (
                    <button
                      onClick={() => {
                        setStatusFilter('all')
                        setDepartmentFilter('all')
                        setRoleFilter('all')
                        setSearchQuery('')
                      }}
                      className="px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 text-sm hover:bg-red-500/30 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear Filters
                    </button>
                  )}
                </div>

              <div className="mt-4 text-white/60 text-sm">
                Showing {filteredMembers.length} of {allMembers.length} members
              </div>
              </div>
              
              {/* Board Members */}
              {boardMembers.length > 0 && (
                <div id="board" className="mb-8 scroll-mt-32">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {boardMembers.map((m) => (
                      <MemberCard 
                        key={m.id} 
                        member={m} 
                        getPictureUrl={getPictureUrl} 
                        canEdit={canEditMember(m)}
                        isOwnProfile={member?.id === m.id}
                        onEdit={() => member?.id === m.id ? handleEditClick() : handleEditOtherMember(m)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Separator between Board and Core Members */}
              {boardMembers.length > 0 && coreMembers.length > 0 && (
                <SeparatorLine title="Core Members" gradient color="blue" />
              )}

              {/* Core Members */}
              {coreMembers.length > 0 && (
                <div id="core" className="mb-8 scroll-mt-32">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coreMembers.map((m) => (
                      <MemberCard 
                        key={m.id} 
                        member={m} 
                        getPictureUrl={getPictureUrl}
                        canEdit={canEditMember(m)}
                        isOwnProfile={member?.id === m.id}
                        onEdit={() => member?.id === m.id ? handleEditClick() : handleEditOtherMember(m)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Separator between Core and Ex-Core Members */}
              {(boardMembers.length > 0 || coreMembers.length > 0) && (exCoreHonorary.length > 0 || exCoreAlumni.length > 0 || exCoreAdvisors.length > 0 || exCoreOthers.length > 0) && (
                <SeparatorLine title="Ex-Core Members" gradient color="purple" />
              )}

              {/* Ex-Core Honorary Members */}
              {exCoreHonorary.length > 0 && (
                <div id="honorary" className="mb-8 scroll-mt-32">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 rounded-lg">
                      <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-amber-300 font-semibold">Honorary Members</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exCoreHonorary.map((m) => (
                      <MemberCard 
                        key={m.id} 
                        member={m} 
                        getPictureUrl={getPictureUrl} 
                        isHonorary
                        canEdit={canEditMember(m)}
                        isOwnProfile={member?.id === m.id}
                        onEdit={() => member?.id === m.id ? handleEditClick() : handleEditOtherMember(m)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Separator between Honorary and Alumni */}
              {exCoreHonorary.length > 0 && exCoreAlumni.length > 0 && (
                <SubSeparatorLine />
              )}

              {/* Ex-Core Alumni Members */}
              {exCoreAlumni.length > 0 && (
                <div id="alumni" className="mb-8 scroll-mt-32">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 rounded-lg">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      </svg>
                      <span className="text-emerald-300 font-semibold">Alumni</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exCoreAlumni.map((m) => (
                      <MemberCard 
                        key={m.id} 
                        member={m} 
                        getPictureUrl={getPictureUrl} 
                        isAlumni
                        canEdit={canEditMember(m)}
                        isOwnProfile={member?.id === m.id}
                        onEdit={() => member?.id === m.id ? handleEditClick() : handleEditOtherMember(m)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Separator between Alumni and Advisors */}
              {exCoreAlumni.length > 0 && exCoreAdvisors.length > 0 && (
                <SubSeparatorLine />
              )}

              {/* Ex-Core Advisor Members */}
              {exCoreAdvisors.length > 0 && (
                <div id="advisors" className="mb-8 scroll-mt-32">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border border-indigo-500/40 rounded-lg">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="text-indigo-300 font-semibold">Advisors</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exCoreAdvisors.map((m) => (
                      <MemberCard 
                        key={m.id} 
                        member={m} 
                        getPictureUrl={getPictureUrl} 
                        isAdvisor
                        canEdit={canEditMember(m)}
                        isOwnProfile={member?.id === m.id}
                        onEdit={() => member?.id === m.id ? handleEditClick() : handleEditOtherMember(m)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Ex-Core Members */}
              {exCoreOthers.length > 0 && (
                <div id="others" className="mb-8 scroll-mt-32">
                  {(exCoreHonorary.length > 0 || exCoreAlumni.length > 0 || exCoreAdvisors.length > 0) && (
                    <div className="mb-6 flex items-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exCoreOthers.map((m) => (
                      <MemberCard 
                        key={m.id} 
                        member={m} 
                        getPictureUrl={getPictureUrl}
                        canEdit={canEditMember(m)}
                        isOwnProfile={member?.id === m.id}
                        onEdit={() => member?.id === m.id ? handleEditClick() : handleEditOtherMember(m)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Members (if any) */}
              {otherMembers.length > 0 && (
                <div className="mb-8">
                  {filteredMembers.length > otherMembers.length && (
                    <SeparatorLine title="Other Members" />
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {otherMembers.map((m) => (
                      <MemberCard 
                        key={m.id} 
                        member={m} 
                        getPictureUrl={getPictureUrl}
                        canEdit={canEditMember(m)}
                        isOwnProfile={member?.id === m.id}
                        onEdit={() => member?.id === m.id ? handleEditClick() : handleEditOtherMember(m)}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {filteredMembers.length === 0 && (
                <div className="text-center py-12 text-white/40">
                  No members found matching your search.
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Organization Statistics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Total Members"
                  value={stats.total}
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                  color="blue"
                />
                <StatCard
                  title="Active Members"
                  value={stats.active}
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  color="green"
                />
                <StatCard
                  title="Departments"
                  value={stats.departments}
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  }
                  color="purple"
                />
                <StatCard
                  title="Ex-Core Members"
                  value={stats.exCore}
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  }
                  color="orange"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DepartmentBreakdown members={allMembers.filter(m => m.Status === 'Active')} />
                <StatusBreakdown members={allMembers} />
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Upcoming Events</h2>
              {(() => {
                console.log('🎨 Dashboard: Rendering events tab with', events.length, 'events')
                return null
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event, index) => {
                  const colors = ['blue', 'purple', 'green', 'orange', 'cyan', 'pink']
                  const color = colors[index % colors.length]

                  return (
                    <EventCard
                      key={event.id}
                      title={event.title}
                      date={formatEventDate(event.start_at, event.end_at)}
                      time={formatEventTime(event.start_at, event.end_at)}
                      location={event.location}
                      description={event.description}
                      organizer={event.organizer_department}
                      maxAttendees={event.capacity_total}
                      currentAttendees={event.current_registrations || 0}
                      hasApplyButton={true}
                      isApplied={event.is_registered || false}
                      color={color}
                      onApply={() => handleEventRegistration(event.id, event.is_registered || false)}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function SeparatorLine({ title, gradient = false, color = 'purple' }: { title?: string; gradient?: boolean; color?: 'purple' | 'cyan' | 'blue' }) {
  const colorSchemes = {
    purple: {
      lineLeft: 'bg-gradient-to-r from-transparent via-purple-500/50 to-blue-500/50',
      lineRight: 'bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-transparent',
      background: 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30',
      text: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-blue-300'
    },
    cyan: {
      lineLeft: 'bg-gradient-to-r from-transparent via-cyan-500/50 to-blue-500/50',
      lineRight: 'bg-gradient-to-r from-blue-500/50 via-cyan-500/50 to-transparent',
      background: 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30',
      text: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300'
    },
    blue: {
      lineLeft: 'bg-gradient-to-r from-transparent via-blue-500/50 to-purple-500/50',
      lineRight: 'bg-gradient-to-r from-purple-500/50 via-blue-500/50 to-transparent',
      background: 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30',
      text: 'text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300'
    }
  }
  
  const scheme = gradient ? colorSchemes[color] : null
  
  return (
    <div className="mb-10 mt-12">
      <div className="flex items-center gap-4">
        <div className={`h-0.5 flex-1 ${gradient ? scheme!.lineLeft : 'bg-gradient-to-r from-transparent via-white/30 to-white/30'}`} />
        {title && (
          <div className={`px-4 py-2 rounded-lg border backdrop-blur-sm ${
            gradient 
              ? scheme!.background
              : 'bg-white/5 border-white/20'
          }`}>
            <span className={`font-semibold ${gradient ? scheme!.text : 'text-white/80'}`}>
              {title}
            </span>
          </div>
        )}
        <div className={`h-0.5 flex-1 ${gradient ? scheme!.lineRight : 'bg-gradient-to-r from-white/30 via-white/30 to-transparent'}`} />
      </div>
    </div>
  )
}

function QuickNavigation({ sections }: { sections: Array<{ id: string; label: string; visible: boolean; color?: string }> }) {
  const visibleSections = sections.filter(s => s.visible)
  
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (visibleSections.length <= 1) return null

  const dotColorMap: Record<string, string> = {
    yellow: 'bg-yellow-400',
    blue: 'bg-blue-400',
    amber: 'bg-amber-400',
    emerald: 'bg-emerald-400',
    indigo: 'bg-indigo-400',
    gray: 'bg-white/40',
  }

  return (
    <div className="fixed left-8 top-1/2 -translate-y-1/2 z-40 hidden xl:block">
      <div className="relative">
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl" />
        
        <div className="relative bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
          <div className="text-white/50 text-[10px] uppercase tracking-widest font-semibold mb-4 px-1">
            Quick Nav
          </div>
          
          <div className="space-y-1">
            {visibleSections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="group w-full px-3 py-2.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center gap-3"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${dotColorMap[section.color || 'gray']} group-hover:scale-150 transition-transform duration-200`} />
                <span className="group-hover:translate-x-0.5 transition-transform duration-200">{section.label}</span>
              </button>
            ))}
          </div>
          
          {/* Divider */}
          <div className="my-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          {/* Back to Top */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group w-full px-3 py-2.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>Back to Top</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function SubSeparatorLine() {
  return (
    <div className="mb-8 mt-8">
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-white/10" />
        <div className="w-2 h-2 rounded-full bg-white/20" />
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/10 to-transparent" />
      </div>
    </div>
  )
}

function ProfileDisplay({ member, sections }: { member: any; sections: any[] }) {
  const formatLink = (url: string | null, platform: string) => {
    if (!url) return <span className="text-white/40">Not provided</span>;
    
    return (
      <a 
        href={url.startsWith('http') ? url : `https://${url}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 group"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        <span className="group-hover:underline">{platform}</span>
      </a>
    );
  };

  const formatUsername = (username: string | null, platform: string) => {
    if (!username) return <span className="text-white/40">Not provided</span>;
    return <span className="text-white">@{username}</span>;
  };

  return (
    <div className="space-y-6">{sections.map((section, idx) => (
        <div key={idx} className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-blue-400">{section.icon}</div>
            <h4 className="text-lg font-semibold text-white">{section.title}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.fields.map((field: any, fieldIdx: number) => (
              <div key={fieldIdx} className="space-y-1">
                <p className="text-white/50 text-xs uppercase tracking-wider font-medium">{field.label}</p>
                <div className="text-white text-sm">{field.value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function EditableProfileForm({
  member,
  onInputChange,
  onSave,
  onCancel,
  saving,
  hasSpecialAccess = false,
  isBoardMember = false,
  isOwnProfile = true,
  canEditField
}: {
  member: any
  onInputChange: (field: string, value: any) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  hasSpecialAccess?: boolean
  isBoardMember?: boolean
  isOwnProfile?: boolean
  canEditField: (fieldKey: string, isOwnProfile: boolean) => boolean
}) {
  type FieldDefinition = {
    key: string
    label: string
    type: string
    placeholder: string
    disabled?: boolean
    options?: string[]
  }

  const fieldSections: Array<{
    title: string
    icon: React.ReactNode
    fields: FieldDefinition[]
  }> = [
    {
      title: 'Personal Information',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      fields: [
        { key: 'Name', label: 'Full Name', type: 'text', placeholder: 'Enter your full name' },
        { key: 'Degree', label: 'Degree', type: 'select', placeholder: 'Select your degree', options: [
          'Bachelor',
          'Master',
          'PhD',
          'Associate',
          'Diploma',
          'Other'
        ] },
        { key: 'Uni', label: 'University', type: 'text', placeholder: 'Enter your university' }
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
        { key: 'Department', label: 'Department', type: 'select', placeholder: 'Your department', options: [
          'Industry',
          'Web3 Talents',
          'Legal & Finance',
          'External Relations',
          'Education',
          'Marketing',
          'IT & Development',
          'Research',
        ] },
        { key: 'Role', label: 'Role', type: 'select', placeholder: 'Your role', options: [
          'Core Member',
          'Board Member',
          'Ex-Core Member',
          'Guest',
        ] },
        { key: 'Status', label: 'Status', type: 'select', placeholder: 'Active, Alumni, etc.', options: [
          'Active',
          'Alumni',
          'Honorary',
          'Advisor',
          'Passive',
          'Kicked out',
          'Left',
        ] },
        { key: 'Semester Joined', label: 'Semester Joined', type: 'text', placeholder: 'e.g., WS2024' },
        { key: 'Active Semesters', label: 'Active Semesters', type: 'number', placeholder: '0' }
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
        { key: 'TBC Email', label: 'TBC Email', type: 'email', disabled: !isOwnProfile && !isBoardMember ? true : false, placeholder: 'member@tbc.email' },
        { key: 'Private Email', label: 'Private Email', type: 'email', placeholder: 'Your personal email' },
        { key: 'Phone', label: 'Phone', type: 'tel', placeholder: '+49 123 456789' }
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
        { key: 'Project/Task', label: 'Current Project/Task', type: 'text', placeholder: 'What are you working on?' },
        { key: 'Area of Expertise', label: 'Area of Expertise', type: 'text', placeholder: 'Your expertise areas' },
        { key: 'Size Merch', label: 'Merch Size', type: 'select', placeholder: 'Select your merch size', options: [
          'XS',
          'S',
          'M',
          'L',
          'XL',
          'XXL'
        ] }
      ]
    }
  ]

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-6">
      {fieldSections.map((section, idx) => (
        <div key={idx} className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-blue-400">{section.icon}</div>
            <h4 className="text-lg font-semibold text-white">{section.title}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.fields.map((field, fieldIdx) => {
              const isFieldDisabled = !canEditField(field.key, isOwnProfile)
              return (
              <div key={fieldIdx} className={field.key === 'Project/Task' || field.key === 'Area of Expertise' ? 'md:col-span-2' : ''}>
                <label className="block text-white/60 text-xs uppercase tracking-wider font-medium mb-2">
                  {field.label}
                  {isFieldDisabled && <span className="ml-2 text-white/40">(Read-only)</span>}
                </label>
                {field.key === 'Uni' ? (
                  <UniversityAutocomplete
                    value={member?.[field.key] || ''}
                    onChange={(value) => onInputChange(field.key, value)}
                    disabled={isFieldDisabled}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={member?.[field.key] || ''}
                    onChange={(e) => onInputChange(field.key, e.target.value)}
                    disabled={isFieldDisabled}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" className="bg-gray-900 text-white">Select {field.label.toLowerCase()}</option>
                    {field.options?.map((option: string) => (
                      <option key={option} value={option} className="bg-gray-900 text-white">{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={member?.[field.key] || ''}
                    onChange={(e) => onInputChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={isFieldDisabled}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                )}
              </div>
            )})}
          </div>
          {section.title === 'Contact Information' && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-200 text-sm">
                <strong>Privacy Notice:</strong> Your contact information and social media profiles are stored securely in our encrypted database. 
                This data is used solely for internal member communication and networking purposes within the organization. 
                We are committed to protecting your privacy and will never share your personal information with third parties without your explicit consent.
              </p>
            </div>
          )}
        </div>
      ))}
    </form>
  )
}

function MemberCard({ member, getPictureUrl, isHonorary = false, isAlumni = false, isAdvisor = false, canEdit = false, isOwnProfile = false, onEdit }: { 
  member: any; 
  getPictureUrl: (pic: any) => string | null;
  isHonorary?: boolean;
  isAlumni?: boolean;
  isAdvisor?: boolean;
  canEdit?: boolean;
  isOwnProfile?: boolean;
  onEdit?: () => void;
}) {
  const isBoardMember = member?.Role === 'Board Member'
  const isCoreMember = member?.Role === 'Core Member'
  
  return (
    <div className={`backdrop-blur-md border rounded-xl p-6 hover:border-white/30 transition-all duration-200 relative overflow-hidden ${
      isBoardMember 
        ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/40 shadow-lg shadow-yellow-500/10' 
        : isHonorary
        ? 'bg-gradient-to-br from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30'
        : isAlumni
        ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30'
        : isAdvisor
        ? 'bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30'
        : isCoreMember
        ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30'
        : 'bg-white/5 border-white/10'
    }`}>
      {/* Sparkle effect for honorary members */}
      {isHonorary && (
        <>
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-400/10 rounded-full blur-xl" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-yellow-400/10 rounded-full blur-xl" />
        </>
      )}
      
      {/* Glow effect for alumni */}
      {isAlumni && (
        <>
          <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-400/10 rounded-full blur-xl" />
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-teal-400/10 rounded-full blur-xl" />
        </>
      )}
      
      {/* Glow effect for advisors */}
      {isAdvisor && (
        <>
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-400/10 rounded-full blur-xl" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-violet-400/10 rounded-full blur-xl" />
        </>
      )}
      
      {isBoardMember && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full">
            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-yellow-400 text-xs font-semibold">Board</span>
          </div>
        </div>
      )}
      
      {isHonorary && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/30 border border-amber-400/50 rounded-full backdrop-blur-sm">
            <svg className="w-3 h-3 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-amber-200 text-xs font-semibold">Honorary</span>
          </div>
        </div>
      )}
      
      {isAlumni && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/30 border border-emerald-400/50 rounded-full backdrop-blur-sm">
            <svg className="w-3 h-3 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 20 20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span className="text-emerald-200 text-xs font-semibold">Alumni</span>
          </div>
        </div>
      )}
      
      {isAdvisor && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-indigo-500/30 border border-indigo-400/50 rounded-full backdrop-blur-sm">
            <svg className="w-3 h-3 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 20 20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-indigo-200 text-xs font-semibold">Advisor</span>
          </div>
        </div>
      )}
      
      <div className="flex items-start gap-4 relative z-0">
        <div className="flex-shrink-0">
          {getPictureUrl(member?.Picture) ? (
            <img 
              src={getPictureUrl(member?.Picture) || ''}
              alt={member?.Name}
              className={`w-20 h-20 rounded-full object-cover border-2 ${
                isBoardMember 
                  ? 'border-yellow-500/60' 
                  : isHonorary 
                  ? 'border-amber-400/60 shadow-lg shadow-amber-500/30'
                  : isAlumni
                  ? 'border-emerald-400/60 shadow-lg shadow-emerald-500/30'
                  : isAdvisor
                  ? 'border-indigo-400/60 shadow-lg shadow-indigo-500/30'
                  : isCoreMember 
                  ? 'border-blue-500/60' 
                  : 'border-white/20'
              }`}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${
            isBoardMember 
              ? 'from-yellow-500 to-orange-600' 
              : isHonorary
              ? 'from-amber-400 to-yellow-500'
              : isAlumni
              ? 'from-emerald-400 to-teal-500'
              : isAdvisor
              ? 'from-indigo-400 to-violet-500'
              : isCoreMember 
              ? 'from-blue-500 to-purple-600' 
              : 'from-blue-500 to-purple-600'
          } flex items-center justify-center border-2 ${
            isBoardMember 
              ? 'border-yellow-500/60' 
              : isHonorary
              ? 'border-amber-400/60 shadow-lg shadow-amber-500/30'
              : isAlumni
              ? 'border-emerald-400/60 shadow-lg shadow-emerald-500/30'
              : isAdvisor
              ? 'border-indigo-400/60 shadow-lg shadow-indigo-500/30'
              : isCoreMember 
              ? 'border-blue-500/60' 
              : 'border-white/20'
          } ${getPictureUrl(member?.Picture) ? 'hidden' : ''}`}>
            <span className="text-2xl font-bold text-white">
              {member?.Name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-semibold truncate ${
            isHonorary 
              ? 'text-amber-100' 
              : isAlumni
              ? 'text-emerald-100'
              : isAdvisor
              ? 'text-indigo-100'
              : 'text-white'
          }`}>{member?.Name}</h3>
          <p className={`text-sm truncate font-medium ${
            isBoardMember 
              ? 'text-yellow-400' 
              : isHonorary
              ? 'text-amber-300'
              : isAlumni
              ? 'text-emerald-300'
              : isAdvisor
              ? 'text-indigo-300'
              : isCoreMember 
              ? 'text-blue-400' 
              : 'text-white/60'
          }`}>{member?.Role}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              member?.Status === 'Active' 
                ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                : isHonorary
                ? 'bg-amber-500/30 border border-amber-400/50 text-amber-300'
                : isAlumni
                ? 'bg-emerald-500/30 border border-emerald-400/50 text-emerald-300'
                : isAdvisor
                ? 'bg-indigo-500/30 border border-indigo-400/50 text-indigo-300'
                : 'bg-gray-500/20 border border-gray-500/40 text-gray-400'
            }`}>
              {member?.Status}
            </span>
            {member?.Department && (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium truncate ${
                isHonorary
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                  : isAlumni
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : isAdvisor
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-purple-500/20 border border-purple-500/40 text-purple-400'
              }`}>
                {member?.Department}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 relative z-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={`text-xs ${isHonorary || isAlumni || isAdvisor ? 'text-white/50' : 'text-white/40'}`}>Email</p>
            <p className={`text-sm truncate ${isHonorary ? 'text-amber-100' : isAlumni ? 'text-emerald-100' : isAdvisor ? 'text-indigo-100' : 'text-white'}`}>
              {member?.['TBC Email']}
            </p>
          </div>
          {canEdit && onEdit && (
            <button
              onClick={onEdit}
              className={`ml-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                isOwnProfile
                  ? 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 hover:text-blue-200'
                  : 'bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {isOwnProfile ? 'My Profile' : 'Edit'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/40 text-blue-400',
    green: 'from-green-500/20 to-green-600/20 border-green-500/40 text-green-400',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/40 text-purple-400',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/40 text-orange-400'
  }
  
  return (
    <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} border backdrop-blur-md rounded-xl p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/60 text-sm font-medium mb-1">{title}</p>
          <p className="text-4xl font-bold text-white">{value}</p>
        </div>
        <div className="opacity-60">{icon}</div>
      </div>
    </div>
  )
}

function EventCard({ 
  title, 
  date, 
  time, 
  location, 
  description, 
  organizer, 
  maxAttendees, 
  currentAttendees, 
  hasApplyButton, 
  isApplied, 
  color,
  onApply
}: { 
  title: string
  date: string
  time: string
  location: string
  description: string
  organizer: string
  maxAttendees: number | null
  currentAttendees: number | null
  hasApplyButton: boolean
  isApplied: boolean
  color: string
  onApply?: () => void
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/40',
    green: 'from-green-500/20 to-green-600/20 border-green-500/40',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/40',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/40',
    cyan: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/40',
    pink: 'from-pink-500/20 to-pink-600/20 border-pink-500/40'
  }

  const buttonColorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    green: 'bg-green-600 hover:bg-green-700 text-white',
    purple: 'bg-purple-600 hover:bg-purple-700 text-white',
    orange: 'bg-orange-600 hover:bg-orange-700 text-white',
    cyan: 'bg-cyan-600 hover:bg-cyan-700 text-white',
    pink: 'bg-pink-600 hover:bg-pink-700 text-white'
  }
  
  return (
    <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} border backdrop-blur-md rounded-xl p-6 hover:border-white/30 transition-all duration-200`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <div className="space-y-1 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {date}
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {time}
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {location}
            </div>
          </div>
        </div>
      </div>
      
      <p className="text-white/80 text-sm mb-4 leading-relaxed">{description}</p>
      
      <div className="flex items-center justify-between text-xs text-white/60 mb-4">
        <span>Organized by: {organizer}</span>
        {maxAttendees && (
          <span>{currentAttendees || 0}/{maxAttendees} attending</span>
        )}
      </div>
      
      {hasApplyButton && (
        <button
          onClick={() => {
            console.log('🔘', isApplied ? 'Deregister' : 'Apply', 'button clicked for event:', title, 'onApply exists:', !!onApply)
            onApply?.()
          }}
          className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            isApplied 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : buttonColorClasses[color as keyof typeof buttonColorClasses]
          }`}
        >
          {isApplied ? 'Deregister' : 'Apply Now'}
        </button>
      )}
    </div>
  )
}

function DepartmentBreakdown({ members }: { members: any[] }) {
  const departmentCounts = members.reduce((acc: Record<string, number>, m) => {
    if (!m.Department) return acc
    
    const departments = m.Department.split(',').map((d: string) => d.trim())
    
    departments.forEach((dept: string) => {
      if (dept && dept.toLowerCase() !== 'unassigned') {
        acc[dept] = (acc[dept] || 0) + 1
      }
    })
    
    return acc
  }, {})

  const sortedDepts = Object.entries(departmentCounts).sort((a, b) => b[1] - a[1])
  const totalCount = members.filter(m => m.Department).length

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Department Distribution</h3>
        <span className="text-white/40 text-xs">{sortedDepts.length} departments</span>
      </div>
      <div className="space-y-3">
        {sortedDepts.map(([dept, count]) => (
          <div key={dept} className="flex items-center justify-between group hover:bg-white/5 rounded-lg p-2 -mx-2 transition-colors duration-200">
            <span className="text-white/80 text-sm font-medium">{dept}</span>
            <div className="flex items-center gap-3">
              <div className="w-32 bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-500 group-hover:from-blue-400 group-hover:to-cyan-400"
                  style={{ width: `${(count / totalCount) * 100}%` }}
                />
              </div>
              <span className="text-white font-semibold text-sm w-8 text-right">{count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusBreakdown({ members }: { members: any[] }) {
  const statusCounts = members.reduce((acc: Record<string, number>, m) => {
    const status = m.Status || 'Unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const statusOrder = ['Active', 'Honorary', 'Alumni', 'Advisor', 'Passive', 'Left', 'Kicked out']
  const sortedStatuses = Object.entries(statusCounts).sort((a, b) => {
    const aIndex = statusOrder.indexOf(a[0])
    const bIndex = statusOrder.indexOf(b[0])
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return b[1] - a[1]
  })

  const statusColors: Record<string, string> = {
    'Active': 'from-green-500 to-emerald-500',
    'Honorary': 'from-amber-500 to-yellow-500',
    'Alumni': 'from-emerald-500 to-teal-500',
    'Advisor': 'from-indigo-500 to-violet-500',
    'Passive': 'from-gray-500 to-slate-500',
    'Left': 'from-orange-500 to-red-500',
    'Kicked out': 'from-red-500 to-rose-500'
  }

  const totalCount = members.length

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Member Status</h3>
        <span className="text-white/40 text-xs">{totalCount} total</span>
      </div>
      <div className="space-y-3">
        {sortedStatuses.map(([status, count]) => {
          const percentage = ((count / totalCount) * 100).toFixed(1)
          return (
            <div key={status} className="flex items-center justify-between group hover:bg-white/5 rounded-lg p-2 -mx-2 transition-colors duration-200">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${statusColors[status] || 'from-gray-500 to-slate-500'}`} />
                <span className="text-white/80 text-sm font-medium">{status}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`bg-gradient-to-r ${statusColors[status] || 'from-gray-500 to-slate-500'} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-white font-semibold text-sm w-8 text-right">{count}</span>
                  <span className="text-white/40 text-xs w-10 text-right">({percentage}%)</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

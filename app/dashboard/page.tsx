'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/auth'
import { memberService } from '@/lib/members'

type TabType = 'profile' | 'members' | 'stats'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [allMembers, setAllMembers] = useState<any[]>([])
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
  const router = useRouter()

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

  useEffect(() => {
    const loadUserData = async () => {
      const { user: currentUser } = await auth.getCurrentUser()
      
      if (!currentUser) {
        router.push('/signin')
        return
      }

      setUser(currentUser)
      
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

      const { data: allMembersData } = await memberService.getAllMembers()
      if (allMembersData) {
        setAllMembers(allMembersData)
      }
      
      setLoading(false)
    }

    loadUserData()
  }, [router])

  const handleSignOut = async () => {
    await auth.signOut()
    router.push('/signin')
  }

  const handleEditClick = () => {
    setEditedMember({ ...member })
    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
    setEditedMember(null)
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
      const { data: updatedMember, error: updateError } = await memberService.updateMember(member.id, editedMember)
      
      if (updateError) {
        setMessage({ type: 'error', text: `Failed to update profile: ${updateError.message}` })
        setSaving(false)
        return
      }

      setMember(updatedMember)
      setEditing(false)
      setEditedMember(null)
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      
      setTimeout(() => {
        setMessage(null)
      }, 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
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
    return (a.Name || '').localeCompare(b.Name || '')
  })

  const uniqueStatuses = [...new Set(allMembers.map(m => m.Status).filter(Boolean))]
  const uniqueDepartments = [...new Set(allMembers.map(m => m.Department).filter(Boolean))]
  const uniqueRoles = [...new Set(allMembers.map(m => m.Role).filter(Boolean))]

  const stats = {
    total: allMembers.length,
    active: allMembers.filter(m => m.Status === 'Active').length,
    departments: [...new Set(allMembers.map(m => m.Department).filter(Boolean))].length,
    alumni: allMembers.filter(m => m.Status === 'Alumni').length
  }

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
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
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
                onClick={() => setActiveTab('profile')}
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
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-12">
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-8">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="relative group">
                  {getPictureUrl(member?.Picture) ? (
                    <img 
                      src={getPictureUrl(member?.Picture) || ''}
                      alt={member?.Name}
                      className="w-24 h-24 rounded-full object-cover border-2 border-white/20"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-2 border-white/20 ${getPictureUrl(member?.Picture) ? 'hidden' : ''}`}>
                    <span className="text-3xl font-bold text-white">
                      {member?.Name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  
                  {editing && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          
                          setUploadingImage(true)
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
                <h2 className="text-2xl font-bold text-white mb-1">{member?.Name}</h2>
                <p className="text-white/60 text-sm mb-3">{member?.['TBC Email']}</p>
                
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-3 py-1 bg-blue-500/20 border border-blue-500/40 rounded-full text-blue-400 text-sm font-medium">
                    {member?.Role}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    member?.Status === 'Active' 
                      ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                      : 'bg-gray-500/20 border border-gray-500/40 text-gray-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      member?.Status === 'Active' ? 'bg-green-400' : 'bg-gray-400'
                    }`}></span>
                    {member?.Status}
                  </span>
                  {member?.Department && (
                    <span className="inline-flex items-center px-3 py-1 bg-purple-500/20 border border-purple-500/40 rounded-full text-purple-400 text-sm font-medium">
                      {member?.Department}
                    </span>
                  )}
                </div>
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
                />
              ) : (
                <ProfileDisplay member={member} />
              )}
            </div>
          </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">All Members</h2>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                    />
                    <svg className="w-5 h-5 text-white/40 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMembers.map((m) => (
                  <MemberCard key={m.id} member={m} getPictureUrl={getPictureUrl} />
                ))}
              </div>
              
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
                  title="Alumni"
                  value={stats.alumni}
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  }
                  color="orange"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DepartmentBreakdown members={allMembers} />
                <RoleBreakdown members={allMembers} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function ProfileDisplay({ member }: { member: any }) {
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

  const sections = [
    {
      title: 'Personal Information',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      fields: [
        { label: 'Full Name', value: member?.Name },
        { label: 'Degree', value: member?.Degree || 'Not specified' },
        { label: 'University', value: member?.Uni || 'Not specified' }
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
        { label: 'Department', value: member?.Department || 'Not assigned' },
        { label: 'Role', value: member?.Role },
        { label: 'Status', value: member?.Status },
        { label: 'Semester Joined', value: member?.['Semester Joined'] || 'Not specified' },
        { label: 'Active Semesters', value: member?.['Active Semesters'] || '0' }
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
        { label: 'TBC Email', value: member?.['TBC Email'] },
        { label: 'Private Email', value: member?.['Private Email'] || 'Not provided' },
        { label: 'Phone', value: member?.Phone || 'Not provided' }
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
        { label: 'LinkedIn', value: formatLink(member?.Linkedin, 'View Profile'), raw: member?.Linkedin },
        { label: 'Telegram', value: formatUsername(member?.Telegram, 'Telegram') },
        { label: 'Discord', value: formatUsername(member?.Discord, 'Discord') },
        { label: 'Instagram', value: formatUsername(member?.Instagram, 'Instagram') },
        { label: 'Twitter/X', value: formatUsername(member?.Twitter, 'Twitter/X') }
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
        { label: 'Current Project/Task', value: member?.['Project/Task'] || 'Not assigned' },
        { label: 'Area of Expertise', value: member?.['Area of Expertise'] || 'Not specified' },
        { label: 'Merch Size', value: member?.['Size Merch'] || 'Not specified' }
      ]
    }
  ]

  return (
    <div className="space-y-6">
      {sections.map((section, idx) => (
        <div key={idx} className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-blue-400">{section.icon}</div>
            <h4 className="text-lg font-semibold text-white">{section.title}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.fields.map((field, fieldIdx) => (
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
  saving
}: {
  member: any
  onInputChange: (field: string, value: any) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const fieldSections = [
    {
      title: 'Personal Information',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      fields: [
        { key: 'Name', label: 'Full Name', type: 'text', placeholder: 'Enter your full name' },
        { key: 'Degree', label: 'Degree', type: 'text', placeholder: 'e.g., Bachelor, Master, PhD' },
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
        { key: 'Department', label: 'Department', type: 'text', placeholder: 'Your department' },
        { key: 'Role', label: 'Role', type: 'text', placeholder: 'Your role' },
        { key: 'Status', label: 'Status', type: 'text', placeholder: 'Active, Alumni, etc.' },
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
        { key: 'TBC Email', label: 'TBC Email', type: 'email', disabled: true, placeholder: 'Your TBC email' },
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
        { key: 'Linkedin', label: 'LinkedIn URL', type: 'url', placeholder: 'https://linkedin.com/in/...' },
        { key: 'Telegram', label: 'Telegram', type: 'text', placeholder: 'username (without @)' },
        { key: 'Discord', label: 'Discord', type: 'text', placeholder: 'username' },
        { key: 'Instagram', label: 'Instagram', type: 'text', placeholder: 'username (without @)' },
        { key: 'Twitter', label: 'Twitter/X', type: 'text', placeholder: 'username (without @)' }
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
        { key: 'Size Merch', label: 'Merch Size', type: 'text', placeholder: 'XS, S, M, L, XL, XXL' }
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
            {section.fields.map((field, fieldIdx) => (
              <div key={fieldIdx} className={field.key === 'Project/Task' || field.key === 'Area of Expertise' ? 'md:col-span-2' : ''}>
                <label className="block text-white/60 text-xs uppercase tracking-wider font-medium mb-2">
                  {field.label}
                  {field.disabled && <span className="ml-2 text-white/40">(Read-only)</span>}
                </label>
                <input
                  type={field.type}
                  value={member?.[field.key] || ''}
                  onChange={(e) => onInputChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </form>
  )
}

function MemberCard({ member, getPictureUrl }: { member: any; getPictureUrl: (pic: any) => string | null }) {
  const isBoardMember = member?.Role === 'Board Member'
  const isCoreMember = member?.Role === 'Core Member'
  
  return (
    <div className={`backdrop-blur-md border rounded-xl p-6 hover:border-white/30 transition-all duration-200 ${
      isBoardMember 
        ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/40 shadow-lg shadow-yellow-500/10' 
        : isCoreMember
        ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30'
        : 'bg-white/5 border-white/10'
    }`}>
      {isBoardMember && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full">
            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-yellow-400 text-xs font-semibold">Board</span>
          </div>
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {getPictureUrl(member?.Picture) ? (
            <img 
              src={getPictureUrl(member?.Picture) || ''}
              alt={member?.Name}
              className={`w-16 h-16 rounded-full object-cover border-2 ${
                isBoardMember ? 'border-yellow-500/60' : isCoreMember ? 'border-blue-500/60' : 'border-white/20'
              }`}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${
            isBoardMember ? 'from-yellow-500 to-orange-600' : isCoreMember ? 'from-blue-500 to-purple-600' : 'from-blue-500 to-purple-600'
          } flex items-center justify-center border-2 ${
            isBoardMember ? 'border-yellow-500/60' : isCoreMember ? 'border-blue-500/60' : 'border-white/20'
          } ${getPictureUrl(member?.Picture) ? 'hidden' : ''}`}>
            <span className="text-xl font-bold text-white">
              {member?.Name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">{member?.Name}</h3>
          <p className={`text-sm truncate font-medium ${
            isBoardMember ? 'text-yellow-400' : isCoreMember ? 'text-blue-400' : 'text-white/60'
          }`}>{member?.Role}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              member?.Status === 'Active' 
                ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                : 'bg-gray-500/20 border border-gray-500/40 text-gray-400'
            }`}>
              {member?.Status}
            </span>
            {member?.Department && (
              <span className="inline-flex items-center px-2 py-1 bg-purple-500/20 border border-purple-500/40 rounded-full text-purple-400 text-xs font-medium truncate">
                {member?.Department}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-white/40 text-xs">Email</p>
        <p className="text-white text-sm truncate">{member?.['TBC Email']}</p>
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

function DepartmentBreakdown({ members }: { members: any[] }) {
  const departments = members.reduce((acc: Record<string, number>, m) => {
    const dept = m.Department || 'Unassigned'
    acc[dept] = (acc[dept] || 0) + 1
    return acc
  }, {})

  const sortedDepts = Object.entries(departments).sort((a, b) => b[1] - a[1])

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Members by Department</h3>
      <div className="space-y-3">
        {sortedDepts.map(([dept, count]) => (
          <div key={dept} className="flex items-center justify-between">
            <span className="text-white/80 text-sm">{dept}</span>
            <div className="flex items-center gap-3">
              <div className="w-32 bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(count / members.length) * 100}%` }}
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

function RoleBreakdown({ members }: { members: any[] }) {
  const roles = members.reduce((acc: Record<string, number>, m) => {
    const role = m.Role || 'Unknown'
    acc[role] = (acc[role] || 0) + 1
    return acc
  }, {})

  const sortedRoles = Object.entries(roles).sort((a, b) => b[1] - a[1])

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Members by Role</h3>
      <div className="space-y-3">
        {sortedRoles.map(([role, count]) => (
          <div key={role} className="flex items-center justify-between">
            <span className="text-white/80 text-sm">{role}</span>
            <div className="flex items-center gap-3">
              <div className="w-32 bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(count / members.length) * 100}%` }}
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

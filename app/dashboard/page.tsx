'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/auth'
import { memberService } from '@/lib/members'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editedMember, setEditedMember] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
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

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 grid-background pointer-events-none">
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute inset-0 grid-glow" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-white/10 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-white/60 text-sm mt-1">Manage your profile</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-6 py-2 text-sm text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg transition-all duration-200"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-12">
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {message.text}
            </div>
          )}

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

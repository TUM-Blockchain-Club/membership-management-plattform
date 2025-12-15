'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/auth'
import { memberService } from '@/lib/members'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadUserData = async () => {
      console.log('📊 [Dashboard] Loading user data')
      const { user: currentUser } = await auth.getCurrentUser()
      
      console.log('📊 [Dashboard] Current user:', currentUser?.email)
      console.log('📊 [Dashboard] Current user ID:', currentUser?.id)
      
      if (!currentUser) {
        console.log('📊 [Dashboard] No user, redirecting to signin')
        router.push('/signin')
        return
      }

      setUser(currentUser)

      console.log('📊 [Dashboard] Fetching member by user_id:', currentUser.id)
      const { data: memberData, error: memberError } = await memberService.getMemberByUserId(currentUser.id)
      console.log('📊 [Dashboard] Member data response:', memberData)
      console.log('📊 [Dashboard] Member error:', memberError)
      
      if (memberError) {
        console.error('📊 [Dashboard] Error fetching member:', memberError)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="absolute inset-0 grid-background">
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute inset-0 grid-glow" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm text-white/80 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6">
              Welcome{member ? `, ${member.first_name}` : ''}!
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-white/60 text-sm">Email</p>
                <p className="text-white">{user?.email}</p>
              </div>

              <div>
                <p className="text-white/60 text-sm">User ID</p>
                <p className="text-white text-xs font-mono">{user?.id}</p>
              </div>

              {member ? (
                <>
                  <div>
                    <p className="text-white/60 text-sm">Name</p>
                    <p className="text-white">{member.first_name} {member.last_name}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Role</p>
                    <p className="text-white">{member.role}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Status</p>
                    <p className="text-white">{member.status}</p>
                  </div>
                  {member.department && (
                    <div>
                      <p className="text-white/60 text-sm">Department</p>
                      <p className="text-white">{member.department}</p>
                    </div>
                  )}
                  {member.university && (
                    <div>
                      <p className="text-white/60 text-sm">University</p>
                      <p className="text-white">{member.university}</p>
                    </div>
                  )}
                  {member.degree && (
                    <div>
                      <p className="text-white/60 text-sm">Degree</p>
                      <p className="text-white">{member.degree}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 text-sm mb-3">
                    Your member profile hasn't been created yet. Please contact an administrator.
                  </p>
                  <p className="text-yellow-300 text-xs">
                    To link your account manually, run this SQL in Supabase:
                  </p>
                  <code className="block mt-2 p-3 bg-black/30 rounded text-xs text-green-400 font-mono break-all">
                    UPDATE mmp.members SET user_id = '{user?.id}' WHERE tbc_email = '{user?.email}';
                  </code>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  useEffect(() => {
    const handleCallback = async () => {
      console.log('🔵 [Callback] Starting auth callback handler')
      console.log('🔵 [Callback] Full URL:', window.location.href)
      console.log('🔵 [Callback] Hash:', window.location.hash)
      console.log('🔵 [Callback] Search params:', window.location.search)
      setDebugInfo(prev => [...prev, 'Starting callback handler...', `URL: ${window.location.href}`])

      try {
        // Wait a moment for the page to fully load
        await new Promise(resolve => setTimeout(resolve, 100))

        // Check if we have hash parameters (OAuth response)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        console.log('🔵 [Callback] Hash fragment:', window.location.hash)
        console.log('🔵 [Callback] Access token present:', !!accessToken)
        console.log('🔵 [Callback] Access token length:', accessToken?.length || 0)
        console.log('🔵 [Callback] Refresh token present:', !!refreshToken)
        setDebugInfo(prev => [...prev, 
          `Hash: ${window.location.hash.substring(0, 50)}...`,
          `Access token: ${!!accessToken} (${accessToken?.length || 0} chars)`, 
          `Refresh token: ${!!refreshToken}`
        ])

        if (accessToken && refreshToken) {
          console.log('🔵 [Callback] Setting session from tokens')
          setDebugInfo(prev => [...prev, 'Setting session from OAuth tokens...'])
          
          // Set the session using the tokens from the hash
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          console.log('🔵 [Callback] Set session result:', data)
          console.log('🔵 [Callback] Set session error:', sessionError)
          setDebugInfo(prev => [...prev, `Session set: ${!!data.session}`, `User: ${data.session?.user?.email || 'none'}`])

          if (sessionError) {
            console.error('🔴 [Callback] Session error:', sessionError)
            setDebugInfo(prev => [...prev, `Error: ${sessionError.message}`])
            router.push('/signin?error=session_failed')
            return
          }

          if (data.session) {
            console.log('✅ [Callback] Session established, waiting before redirect')
            setDebugInfo(prev => [...prev, 'Success! Waiting 2s before redirect...'])
            
            // Wait for session to be persisted
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            // Clear the hash from URL
            window.history.replaceState(null, '', '/auth/callback')
            
            console.log('✅ [Callback] Now redirecting to dashboard')
            setDebugInfo(prev => [...prev, 'Redirecting now...'])
            
            // Force a hard redirect to ensure middleware sees the session
            window.location.href = '/dashboard'
            return
          }
        }

        // Fallback: check for existing session
        console.log('🔵 [Callback] No OAuth tokens in hash, checking existing session')
        setDebugInfo(prev => [...prev, 'No OAuth tokens found, checking existing session...'])
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('🔵 [Callback] Existing session:', session)
        console.log('🔵 [Callback] Error:', error)
        setDebugInfo(prev => [...prev, `Session exists: ${!!session}`])
        
        if (error) {
          console.error('🔴 [Callback] Auth callback error:', error)
          setDebugInfo(prev => [...prev, `Error: ${error.message}`])
          router.push('/signin?error=auth_failed')
          return
        }

        if (session) {
          console.log('✅ [Callback] Session found, redirecting to dashboard')
          setDebugInfo(prev => [...prev, 'Redirecting to dashboard...'])
          window.location.href = '/dashboard'
        } else {
          console.log('⚠️ [Callback] No session found, redirecting to signin')
          setDebugInfo(prev => [...prev, 'No session found, redirecting to signin...'])
          setTimeout(() => router.push('/signin'), 1000)
        }
      } catch (err) {
        console.error('🔴 [Callback] Unexpected error:', err)
        setDebugInfo(prev => [...prev, `Unexpected error: ${err}`])
        router.push('/signin?error=unexpected')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center max-w-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white/60 mb-6">Signing you in...</p>
        
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-left">
          <p className="text-white/80 text-xs font-mono mb-2">Debug Info:</p>
          {debugInfo.map((info, i) => (
            <p key={i} className="text-white/60 text-xs font-mono">{info}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CoffeeIcon } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Coffee Chats – TBC Member Portal',
  description: 'Monthly coffee chat matching for TUM Blockchain Club members',
}

export default async function CoffeeChatsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-background pointer-events-none" />

      <div className="relative z-10">
        {/* Header — matches DashboardHeader structure exactly */}
        <header className="border-b border-border bg-background sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <CoffeeIcon className="size-6 text-white/60 shrink-0" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">Coffee Chats</h1>
                <p className="text-white/60 text-xs sm:text-sm mt-0.5">TUM Blockchain Club — monthly coffee matching</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="outline" size="lg" asChild className="text-xs sm:text-sm">
                <Link href="/profile">Back to Dashboard</Link>
              </Button>
            </div>
          </div>

          {/* Sub-nav */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 sm:pb-4">
            <nav className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
              {[
                { href: '/coffee-chats', label: 'Overview' },
                { href: '/coffee-chats/setup', label: 'My Profile' },
                { href: '/coffee-chats/join', label: 'Join Round' },
                { href: '/coffee-chats/my-match', label: 'My Match' },
                { href: '/coffee-chats/gallery', label: 'Gallery' },
              ].map(({ href, label }) => (
                <Button
                  key={href}
                  variant="ghost"
                  size="lg"
                  asChild
                  className="text-xs sm:text-sm flex-shrink-0 text-white/60 hover:text-white hover:bg-white/5"
                >
                  <Link href={href}>{label}</Link>
                </Button>
              ))}
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12">
          {children}
        </main>

        <footer className="border-t border-border mt-16 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-white/40 text-sm">
            TUM Blockchain Club — Coffee Chats
          </div>
        </footer>
      </div>
    </div>
  )
}

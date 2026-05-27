import { Skeleton } from '@/components/ui/skeleton'

export function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-background pointer-events-none" />

      <div className="relative z-10">
        <header className="border-b border-white/10 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <Skeleton className="h-8 w-40 bg-white/10" />
            <Skeleton className="mt-2 h-4 w-56 bg-white/5" />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 sm:pb-4">
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-28 flex-shrink-0 bg-white/5" />
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-2xl border border-white/10 bg-white/[0.03]" />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

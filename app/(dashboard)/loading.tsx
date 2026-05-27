import { Spinner } from '@/components/ui/spinner'

// Shown as the Suspense fallback while the page chunk streams in.
// The persistent DashboardShell (header + nav) stays mounted around this.
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner className="text-muted-foreground" />
    </div>
  )
}

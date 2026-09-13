import { Skeleton } from '@/components/ui/skeleton'
export default function Loading() {
  return <div className="mx-auto max-w-7xl px-6 py-12" aria-label="Loading the Tree of Life"><Skeleton className="mx-auto h-20 w-3/4" /><Skeleton className="mx-auto mt-6 h-5 w-1/2" /><div className="mt-20 space-y-12">{[0, 1, 2].map(row => <div className="flex items-center gap-6" key={row}><Skeleton className="h-16 w-24 shrink-0" /><div className="flex flex-1 justify-around gap-3">{[0, 1, 2, 3, 4].map(node => <Skeleton key={node} className="size-12 rounded-full sm:size-16" />)}</div></div>)}</div></div>
}

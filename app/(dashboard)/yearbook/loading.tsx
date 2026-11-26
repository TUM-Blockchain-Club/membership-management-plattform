import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function YearbookLoading() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading the yearbook">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
      </Card>
      <Skeleton className="h-8 w-80 max-w-full" />
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-[4.5rem] w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function CoffeeChatsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading Coffee Chats">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <CardAction>
            <Skeleton className="h-6 w-32" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-1 w-full" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-6 w-28 max-w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-48 max-w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

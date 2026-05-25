import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

export function StatCard({ title, value, icon, color }: { title: string; value: number; icon: ReactNode; color: string }) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/40 text-blue-400',
    green: 'from-green-500/20 to-green-600/20 border-green-500/40 text-green-400',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/40 text-purple-400',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/40 text-orange-400'
  }

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} border backdrop-blur-md py-0`}>
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between">
        <div>
          <p className="text-white/60 text-[10px] sm:text-xs md:text-sm font-medium mb-0.5 sm:mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{value}</p>
        </div>
        <div className="opacity-60">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

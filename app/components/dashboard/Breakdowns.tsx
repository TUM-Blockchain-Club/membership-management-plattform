import { DashboardMember } from './types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function DepartmentBreakdown({ members }: { members: DashboardMember[] }) {
  const departmentCounts = members.reduce((acc: Record<string, number>, m) => {
    if (!m.Department) return acc

    const departments = m.Department.split(',').map((d: string) => d.trim())

    departments.forEach((dept: string) => {
      if (dept && dept.toLowerCase() !== 'unassigned') {
        acc[dept] = (acc[dept] || 0) + 1
      }
    })

    return acc
  }, {})

  const sortedDepts = Object.entries(departmentCounts).sort((a, b) => b[1] - a[1])
  const totalCount = members.filter(m => m.Department).length

  return (
    <Card className="bg-white/5 backdrop-blur-md">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg md:text-xl font-bold text-white">Department Distribution</CardTitle>
        <Badge variant="outline" className="text-white/50">{sortedDepts.length} departments</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:gap-3">
        {sortedDepts.map(([dept, count]) => (
          <div key={dept} className="flex items-center justify-between group hover:bg-white/5 rounded-lg p-1.5 sm:p-2 -mx-1.5 sm:-mx-2 transition-colors duration-200">
            <span className="text-white/80 text-xs sm:text-sm font-medium truncate flex-1 mr-2">{dept}</span>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="w-16 sm:w-24 md:w-32 bg-white/10 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-500 group-hover:from-blue-400 group-hover:to-cyan-400" style={{ width: `${(count / totalCount) * 100}%` }} />
              </div>
              <span className="text-white font-semibold text-xs sm:text-sm w-6 sm:w-8 text-right">{count}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function StatusBreakdown({ members }: { members: DashboardMember[] }) {
  const statusCounts = members.reduce((acc: Record<string, number>, m) => {
    const status = m.Status || 'Unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const statusOrder = ['Active', 'Honorary', 'Alumni', 'Advisor', 'Passive', 'Left', 'Kicked out']
  const sortedStatuses = Object.entries(statusCounts).sort((a, b) => {
    const aIndex = statusOrder.indexOf(a[0])
    const bIndex = statusOrder.indexOf(b[0])
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return b[1] - a[1]
  })

  const statusColors: Record<string, string> = {
    'Active': 'from-green-500 to-emerald-500',
    'Honorary': 'from-amber-500 to-yellow-500',
    'Alumni': 'from-emerald-500 to-teal-500',
    'Advisor': 'from-indigo-500 to-violet-500',
    'Passive': 'from-gray-500 to-slate-500',
    'Left': 'from-orange-500 to-red-500',
    'Kicked out': 'from-red-500 to-rose-500'
  }

  const totalCount = members.length

  return (
    <Card className="bg-white/5 backdrop-blur-md">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg md:text-xl font-bold text-white">Member Status</CardTitle>
        <Badge variant="outline" className="text-white/50">{totalCount} total</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:gap-3">
        {sortedStatuses.map(([status, count]) => {
          const percentage = ((count / totalCount) * 100).toFixed(1)
          return (
            <div key={status} className="flex items-center justify-between group hover:bg-white/5 rounded-lg p-1.5 sm:p-2 -mx-1.5 sm:-mx-2 transition-colors duration-200">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 mr-2">
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-r flex-shrink-0 ${statusColors[status] || 'from-gray-500 to-slate-500'}`} />
                <span className="text-white/80 text-xs sm:text-sm font-medium truncate">{status}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className="w-16 sm:w-24 md:w-32 bg-white/10 rounded-full h-2 overflow-hidden">
                  <div className={`bg-gradient-to-r ${statusColors[status] || 'from-gray-500 to-slate-500'} h-full rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <span className="text-white font-semibold text-xs sm:text-sm w-6 sm:w-8 text-right">{count}</span>
                  <span className="text-white/40 text-[9px] sm:text-xs w-8 sm:w-10 text-right">({percentage}%)</span>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

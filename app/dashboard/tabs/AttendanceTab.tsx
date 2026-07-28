import type { DashboardMember } from '@/app/components/dashboard/types'
import { AttendancePage } from './attendance/AttendancePage'

export function AttendanceTab({
  isBoard,
  allMembers,
}: {
  isBoard: boolean
  allMembers: DashboardMember[]
}) {
  return <AttendancePage isBoard={isBoard} allMembers={allMembers} />
}

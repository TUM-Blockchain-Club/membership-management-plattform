import type { ReactNode } from 'react'
import type { Event, Participant } from '@/lib/events'
import type { Member } from '@/lib/types/database.types'

export type ProfileSectionField = {
  label: string
  value?: string | number | null
}

export type ProfileSection = {
  title: string
  icon: ReactNode
  fields: ProfileSectionField[]
}

export type DashboardMember = Member

export type DashboardMemberWithPicture = DashboardMember & {
  pictureUrl: string | null
}

export type EditableMember = Partial<DashboardMember>

export type DashboardEvent = Event

export type DashboardParticipant = Participant

export type DashboardStats = {
  total: number
  active: number
  departments: number
  exCore: number
}

export type DashboardTab = 'profile' | 'members' | 'stats' | 'events'

export type DashboardMessage = {
  type: 'success' | 'error'
  text: string
}

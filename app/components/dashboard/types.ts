import type { ReactNode } from 'react'
import type { Event, InterestedMember, Participant } from '@/lib/events'
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

export type EditableMember = Partial<DashboardMember>

export type DashboardEvent = Event

export type DashboardParticipant = Participant

export type DashboardInterestedMember = InterestedMember

export type DashboardStats = {
  total: number
  active: number
  departments: number
  exCore: number
}

export type DashboardTab =
  | 'profile'
  | 'email-signature'
  | 'members'
  | 'stats'
  | 'events'
  | 'link-analytics'
  | 'nft-approvals'
  | 'nft-status'
  | 'newsletter'

export type DashboardMessage = {
  type: 'success' | 'error'
  text: string
}

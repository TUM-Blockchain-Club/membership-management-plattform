import type { ReactNode } from 'react'

export type ProfileSectionField = {
  label: string
  value?: string | number | null
}

export type ProfileSection = {
  title: string
  icon: ReactNode
  fields: ProfileSectionField[]
}

export type EditableMember = Record<string, string | number | null | undefined>

export type DashboardMember = {
  Name?: string | null
  Role?: string | null
  Status?: string | null
  Department?: string | null
  Picture?: unknown
  'TBC Email'?: string | null
}

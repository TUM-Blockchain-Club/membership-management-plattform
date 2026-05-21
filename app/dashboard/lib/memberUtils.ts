import type { DashboardMember, EditableMember } from '@/app/components/dashboard/types'

export const ADMIN_FIELDS = ['Role', 'Status', 'Department', 'Semester Joined'] as const

export const makeEmptyMember = (): EditableMember => ({
  Name: null,
  Degree: null,
  Uni: null,
  Department: null,
  Role: null,
  Status: null,
  'Semester Joined': null,
  'TBC Email': null,
  'Private Email': null,
  Phone: null,
  Linkedin: null,
  Telegram: null,
  Discord: null,
  Instagram: null,
  Twitter: null,
  'Project/Task': null,
  'Area of Expertise': null,
  'Size Merch': null,
  Picture: null,
})

export const toDisplayString = (value: unknown, fallback = 'Not specified') => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || fallback
  }
  if (value === null || value === undefined) return fallback
  if (typeof value === 'number') return String(value)
  return fallback
}

export const getPictureUrl = (picture: unknown) => {
  if (!picture) return null

  if (typeof picture === 'string') {
    if (picture.startsWith('\\x')) {
      const hexString = picture.substring(2)
      let url = ''
      for (let i = 0; i < hexString.length; i += 2) {
        url += String.fromCharCode(parseInt(hexString.substring(i, i + 2), 16))
      }
      return url
    }
    return picture
  }

  if (typeof picture === 'object' && picture !== null && 'data' in picture) {
    const dataValue = (picture as { data?: unknown }).data
    if (!Array.isArray(dataValue)) {
      return null
    }

    try {
      return String.fromCharCode(...dataValue)
    } catch {
      return null
    }
  }

  return null
}

export const isDashboardMemberAdmin = (member: DashboardMember | null) => {
  if (!member) return false

  const memberRecord = member as unknown as Record<string, unknown>
  return Boolean(memberRecord.is_Admin) || member.Role === 'Board Member'
}

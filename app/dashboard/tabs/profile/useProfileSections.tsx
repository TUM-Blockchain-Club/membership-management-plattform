import { useMemo } from 'react'
import type { DashboardMember, ProfileSection } from '@/app/components/dashboard/types'
import { toDisplayString } from '@/app/dashboard/lib/memberUtils'

export function useProfileSections(viewedMember: DashboardMember | null): ProfileSection[] {
  return useMemo(() => {
    const current = viewedMember

    return [
      {
        title: 'Personal Information',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
        fields: [
          { label: 'Full Name', value: toDisplayString(current?.Name, 'Unknown') },
          { label: 'Degree', value: toDisplayString(current?.Degree) },
          { label: 'University', value: toDisplayString(current?.Uni) },
        ],
      },
      {
        title: 'Organization',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        fields: [
          { label: 'Department', value: toDisplayString(current?.Department, 'Not assigned') },
          { label: 'Role', value: toDisplayString(current?.Role, 'Member') },
          { label: 'Status', value: toDisplayString(current?.Status, 'Unknown') },
          { label: 'Semester Joined', value: toDisplayString(current?.['Semester Joined']) },
        ],
      },
      {
        title: 'Contact Information',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
        fields: [
          { label: 'TBC Email', value: toDisplayString(current?.['TBC Email'], 'No email provided') },
          { label: 'Private Email', value: toDisplayString(current?.['Private Email'], 'Not provided') },
          { label: 'Phone', value: toDisplayString(current?.Phone, 'Not provided') },
        ],
      },
      {
        title: 'Professional & Social',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        ),
        fields: [
          { label: 'LinkedIn URL', value: toDisplayString(current?.Linkedin) },
          { label: 'Telegram', value: toDisplayString(current?.Telegram) },
          { label: 'Discord', value: toDisplayString(current?.Discord) },
          { label: 'Instagram', value: toDisplayString(current?.Instagram) },
          { label: 'Twitter/X', value: toDisplayString(current?.Twitter) },
        ],
      },
      {
        title: 'Additional Details',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        fields: [
          { label: 'Current Project/Task', value: toDisplayString(current?.['Project/Task'], 'Not assigned') },
          { label: 'Area of Expertise', value: toDisplayString(current?.['Area of Expertise']) },
          { label: 'Merch Size', value: toDisplayString(current?.['Size Merch']) },
        ],
      },
    ]
  }, [viewedMember])
}

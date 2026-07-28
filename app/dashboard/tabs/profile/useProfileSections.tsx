import { useMemo } from 'react'
import { Building2Icon, FileTextIcon, Globe2Icon, MailIcon, UserIcon } from 'lucide-react'
import type { DashboardMember, ProfileSection } from '@/app/components/dashboard/types'
import { toDisplayString } from '@/app/dashboard/lib/memberUtils'

export function useProfileSections(viewedMember: DashboardMember | null): ProfileSection[] {
  return useMemo(() => {
    const current = viewedMember

    return [
      {
        title: 'Personal Information',
        icon: <UserIcon className="size-5" />,
        fields: [
          { label: 'Full Name', value: toDisplayString(current?.Name, 'Unknown') },
          { label: 'Degree', value: toDisplayString(current?.Degree) },
          { label: 'University', value: toDisplayString(current?.Uni) },
        ],
      },
      {
        title: 'Organization',
        icon: <Building2Icon className="size-5" />,
        fields: [
          { label: 'Department', value: toDisplayString(current?.Department, 'Not assigned') },
          { label: 'Role', value: toDisplayString(current?.Role, 'Member') },
          { label: 'Status', value: toDisplayString(current?.Status, 'Unknown') },
          { label: 'Semester Joined', value: toDisplayString(current?.['Semester Joined']) },
        ],
      },
      {
        title: 'Contact Information',
        icon: <MailIcon className="size-5" />,
        fields: [
          { label: 'TBC Email', value: toDisplayString(current?.['TBC Email'], 'No email provided') },
          { label: 'Private Email', value: toDisplayString(current?.['Private Email'], 'Not provided') },
          { label: 'Phone', value: toDisplayString(current?.Phone, 'Not provided') },
        ],
      },
      {
        title: 'Professional & Social',
        icon: <Globe2Icon className="size-5" />,
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
        icon: <FileTextIcon className="size-5" />,
        fields: [
          { label: 'Current Project/Task', value: toDisplayString(current?.['Project/Task'], 'Not assigned') },
          { label: 'Area of Expertise', value: toDisplayString(current?.['Area of Expertise']) },
          { label: 'Merch Size', value: toDisplayString(current?.['Size Merch']) },
        ],
      },
    ]
  }, [viewedMember])
}

import {
  BookOpenIcon,
  BuildingIcon,
  GlobeIcon,
  LockIcon,
  MailIcon,
  UserIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import UniversityAutocomplete from '@/app/components/UniversityAutocomplete'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { EditableMember } from './types'

// ── Field section definitions ─────────────────────────────────────────────

type FieldDef = {
  key: string
  label: string
  type: string
  placeholder: string
  options?: string[]
  wide?: boolean
}

type Section = {
  title: string
  icon: ReactNode
  fields: FieldDef[]
}

const FIELD_SECTIONS: Section[] = [
  {
    title: 'Personal',
    icon: <UserIcon />,
    fields: [
      { key: 'Name',            label: 'Full Name',      type: 'text',   placeholder: 'Enter your full name' },
      { key: 'Degree',          label: 'Degree',         type: 'select', placeholder: 'Select degree',
        options: ['Bachelor', 'Master', 'PhD', 'Associate', 'Diploma', 'Other'] },
      { key: 'Uni',             label: 'University',     type: 'uni',    placeholder: 'Enter your university' },
    ],
  },
  {
    title: 'Organization',
    icon: <BuildingIcon />,
    fields: [
      { key: 'Department',      label: 'Department',     type: 'select', placeholder: 'Select department',
        options: ['Industry', 'Web3 Talents', 'Legal & Finance', 'External Relations', 'Education', 'Marketing', 'IT & Development', 'Research'] },
      { key: 'Role',            label: 'Role',           type: 'select', placeholder: 'Select role',
        options: ['Core Member', 'Board Member', 'Ex-Core Member', 'Guest'] },
      { key: 'Status',          label: 'Status',         type: 'select', placeholder: 'Select status',
        options: ['Active', 'Alumni', 'Honorary', 'Advisor', 'Passive', 'Kicked out', 'Left'] },
      { key: 'Semester Joined', label: 'Semester Joined',type: 'text',   placeholder: 'e.g. WS2024' },
    ],
  },
  {
    title: 'Contact',
    icon: <MailIcon />,
    fields: [
      { key: 'TBC Email',       label: 'TBC Email',      type: 'email',  placeholder: 'member@tbc.email' },
      { key: 'Private Email',   label: 'Private Email',  type: 'email',  placeholder: 'Your personal email' },
      { key: 'Phone',           label: 'Phone',          type: 'tel',    placeholder: '+49 123 456789' },
    ],
  },
  {
    title: 'Social',
    icon: <GlobeIcon />,
    fields: [
      { key: 'Linkedin',        label: 'LinkedIn',       type: 'url',    placeholder: 'https://linkedin.com/in/…' },
      { key: 'Telegram',        label: 'Telegram',       type: 'text',   placeholder: '@username' },
      { key: 'Discord',         label: 'Discord',        type: 'text',   placeholder: 'username#1234' },
      { key: 'Instagram',       label: 'Instagram',      type: 'text',   placeholder: '@username' },
      { key: 'Twitter',         label: 'Twitter / X',    type: 'text',   placeholder: '@username' },
    ],
  },
  {
    title: 'Additional',
    icon: <BookOpenIcon />,
    fields: [
      { key: 'Project/Task',       label: 'Current Project / Task', type: 'text', placeholder: 'What are you working on?', wide: true },
      { key: 'Area of Expertise',  label: 'Area of Expertise',      type: 'text', placeholder: 'Your expertise areas',      wide: true },
      { key: 'Size Merch',         label: 'Merch Size',             type: 'select', placeholder: 'Select size',
        options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────

export function EditableProfileForm({
  member,
  onInputChange,
  onSave,
  isBoardMember = false,
  isOwnProfile = true,
  canEditField,
}: {
  member: EditableMember
  onInputChange: (field: string, value: string | number | null) => void
  onSave: () => void
  isBoardMember?: boolean
  isOwnProfile?: boolean
  canEditField: (fieldKey: string, isOwnProfile: boolean) => boolean
}) {
  const rec = member as Record<string, string | number | null | undefined>

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave() }}
      className="flex flex-col gap-5"
    >
      {FIELD_SECTIONS.map((section) => {
        // Skip sections where every field is empty AND read-only — keep visible if any field has content or is editable
        const hasContent = section.fields.some(
          (f) => rec[f.key] != null && rec[f.key] !== '' || canEditField(f.key, isOwnProfile),
        )
        if (!hasContent) return null

        return (
          <Card key={section.title}>
            <CardHeader className="flex-row items-center gap-2 pb-4">
              <span className="text-muted-foreground [&_svg]:size-4">{section.icon}</span>
              <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {section.fields.map((field) => {
                  const isLocked = !canEditField(field.key, isOwnProfile)
                  const value    = String(rec[field.key] ?? '')

                  return (
                    <Field
                      key={field.key}
                      data-disabled={isLocked || undefined}
                      className={cn(field.wide ? 'sm:col-span-2' : '')}
                    >
                      {/* Label — show lock icon for read-only fields */}
                      <FieldLabel className={cn(
                        'text-xs uppercase tracking-wider font-medium flex items-center gap-1',
                        isLocked ? 'text-muted-foreground/60' : 'text-muted-foreground',
                      )}>
                        {field.label}
                        {isLocked && <LockIcon className="size-3 opacity-50" />}
                      </FieldLabel>

                      {/* Control */}
                      {field.type === 'uni' ? (
                        <UniversityAutocomplete
                          value={value}
                          onChange={(v) => onInputChange(field.key, v)}
                          disabled={isLocked}
                        />
                      ) : field.type === 'select' ? (
                        <Select
                          value={value || undefined}
                          onValueChange={(v) => onInputChange(field.key, v)}
                          disabled={isLocked}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {field.options?.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={field.type}
                          value={value}
                          onChange={(e) => onInputChange(field.key, e.target.value)}
                          placeholder={isLocked ? '' : field.placeholder}
                          disabled={isLocked}
                        />
                      )}

                      {/* Read-only hint */}
                      {isLocked && (
                        <FieldDescription className="text-[11px]">
                          Only admins can change this field.
                        </FieldDescription>
                      )}
                    </Field>
                  )
                })}
              </FieldGroup>

              {/* Privacy notice for Contact section */}
              {section.title === 'Contact' && (
                <Alert className="mt-4">
                  <AlertDescription className="text-xs">
                    Contact details are stored securely and used only for internal member communication.
                    They are never shared with third parties.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )
      })}
    </form>
  )
}

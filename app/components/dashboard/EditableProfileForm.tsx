import type { ReactNode } from 'react'
import UniversityAutocomplete from '@/app/components/UniversityAutocomplete'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EditableMember } from './types'

export function EditableProfileForm({
  member,
  onInputChange,
  onSave,
  isBoardMember = false,
  isOwnProfile = true,
  canEditField
}: {
  member: EditableMember
  onInputChange: (field: string, value: string | number | null) => void
  onSave: () => void
  isBoardMember?: boolean
  isOwnProfile?: boolean
  canEditField: (fieldKey: string, isOwnProfile: boolean) => boolean
}) {
  const memberRecord = member as Record<string, string | number | null | undefined>

  type FieldDefinition = {
    key: string
    label: string
    type: string
    placeholder: string
    disabled?: boolean
    options?: string[]
  }

  const fieldSections: Array<{
    title: string
    icon: ReactNode
    fields: FieldDefinition[]
  }> = [
    {
      title: 'Personal Information',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      fields: [
        { key: 'Name', label: 'Full Name', type: 'text', placeholder: 'Enter your full name' },
        { key: 'Degree', label: 'Degree', type: 'select', placeholder: 'Select your degree', options: ['Bachelor', 'Master', 'PhD', 'Associate', 'Diploma', 'Other'] },
        { key: 'Uni', label: 'University', type: 'text', placeholder: 'Enter your university' }
      ]
    },
    {
      title: 'Organization',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      fields: [
        { key: 'Department', label: 'Department', type: 'select', placeholder: 'Your department', options: ['Industry', 'Web3 Talents', 'Legal & Finance', 'External Relations', 'Education', 'Marketing', 'IT & Development', 'Research'] },
        { key: 'Role', label: 'Role', type: 'select', placeholder: 'Your role', options: ['Core Member', 'Board Member', 'Ex-Core Member', 'Guest'] },
        { key: 'Status', label: 'Status', type: 'select', placeholder: 'Active, Alumni, etc.', options: ['Active', 'Alumni', 'Honorary', 'Advisor', 'Passive', 'Kicked out', 'Left'] },
        { key: 'Semester Joined', label: 'Semester Joined', type: 'text', placeholder: 'e.g., WS2024' }
      ]
    },
    {
      title: 'Contact Information',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      fields: [
        { key: 'TBC Email', label: 'TBC Email', type: 'email', disabled: !isOwnProfile && !isBoardMember ? true : false, placeholder: 'member@tbc.email' },
        { key: 'Private Email', label: 'Private Email', type: 'email', placeholder: 'Your personal email' },
        { key: 'Phone', label: 'Phone', type: 'tel', placeholder: '+49 123 456789' }
      ]
    },
    {
      title: 'Professional & Social',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      fields: [
        { key: 'Linkedin', label: 'LinkedIn URL', type: 'url', placeholder: 'https://www.linkedin.com/in/john-doe' },
        { key: 'Telegram', label: 'Telegram', type: 'text', placeholder: 'john_doe' },
        { key: 'Discord', label: 'Discord', type: 'text', placeholder: 'john_doe#1234' },
        { key: 'Instagram', label: 'Instagram', type: 'text', placeholder: 'john_doe' },
        { key: 'Twitter', label: 'Twitter/X', type: 'text', placeholder: 'john_doe' }
      ]
    },
    {
      title: 'Additional Details',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      fields: [
        { key: 'Project/Task', label: 'Current Project/Task', type: 'text', placeholder: 'What are you working on?' },
        { key: 'Area of Expertise', label: 'Area of Expertise', type: 'text', placeholder: 'Your expertise areas' },
        { key: 'Size Merch', label: 'Merch Size', type: 'select', placeholder: 'Select your merch size', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] }
      ]
    }
  ]

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="flex flex-col gap-6">
      {fieldSections.map((section, idx) => (
        <Card key={idx} className="bg-white/[0.02]">
          <CardHeader className="flex-row items-center gap-2">
            <div className="text-blue-400">{section.icon}</div>
            <CardTitle className="text-lg font-semibold text-white">{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {section.fields.map((field, fieldIdx) => {
              const isFieldDisabled = !canEditField(field.key, isOwnProfile)
              const fieldValue = String(memberRecord[field.key] ?? '')

              return (
                <Field
                  key={fieldIdx}
                  data-disabled={isFieldDisabled || undefined}
                  className={field.key === 'Project/Task' || field.key === 'Area of Expertise' ? 'md:col-span-2' : ''}
                >
                  <FieldLabel className="text-white/60 text-xs uppercase tracking-wider font-medium">
                    {field.label}
                    {isFieldDisabled && <span className="ml-2 text-white/40">(Read-only)</span>}
                  </FieldLabel>
                  {field.key === 'Uni' ? (
                    <UniversityAutocomplete
                      value={fieldValue}
                      onChange={(value) => onInputChange(field.key, value)}
                      disabled={isFieldDisabled}
                    />
                  ) : field.type === 'select' ? (
                    <Select
                      value={fieldValue || undefined}
                      onValueChange={(value) => onInputChange(field.key, value)}
                      disabled={isFieldDisabled}
                    >
                      <SelectTrigger className="w-full bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {field.options?.map((option: string) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.type}
                      value={fieldValue}
                      onChange={(e) => onInputChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      disabled={isFieldDisabled}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                    />
                  )}
                </Field>
              )
            })}
          </FieldGroup>
          {section.title === 'Contact Information' && (
            <Alert className="mt-4 bg-blue-500/10 border-blue-500/20">
              <AlertDescription className="text-blue-200">
                <strong>Privacy Notice:</strong> Your contact information and social media profiles are stored securely in our encrypted database.
                This data is used solely for internal member communication and networking purposes within the organization.
                We are committed to protecting your privacy and will never share your personal information with third parties without your explicit consent.
              </AlertDescription>
            </Alert>
          )}
          </CardContent>
        </Card>
      ))}
    </form>
  )
}

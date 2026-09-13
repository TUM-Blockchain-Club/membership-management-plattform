'use client'

import { SearchableSelect } from '@/components/searchable-select'
import { searchUniversities } from '@/lib/universities'

export default function UniversityAutocomplete({ value, onChange, disabled = false }: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return <SearchableSelect label="University" value={value} onChange={onChange} disabled={disabled}
    placeholder="Choose university" allowCreate options={value ? [{value, label:value}] : []}
    searchOptions={query => [
      ...(!query ? [{value:'',label:'No university'}] : []),
      ...(query ? searchUniversities(query) : []).map(institution => ({
        value:institution.name, label:institution.name,
        description:[institution.fullName, institution.city, institution.country].filter(Boolean).join(' · '),
      })),
    ]}
  />
}

'use client'

import { useMemo } from 'react'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { searchUniversities } from '@/lib/universities'

interface Institution {
  name: string
  fullName: string
  country: string
  city?: string
  score?: number
}

interface UniversityAutocompleteProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function UniversityAutocomplete({ value, onChange, disabled = false }: UniversityAutocompleteProps) {
  const suggestions = useMemo(
    () => value.trim() ? searchUniversities(value) : [],
    [value]
  )

  const selected = useMemo(
    () => suggestions.find((institution) => institution.name === value) ?? null,
    [suggestions, value]
  )

  return (
    <Combobox
      items={suggestions}
      value={selected}
      inputValue={value}
      itemToStringLabel={(institution: Institution) => institution.name}
      itemToStringValue={(institution: Institution) => institution.name}
      isItemEqualToValue={(institution, current) => institution.name === current.name}
      onInputValueChange={(nextValue) => {
        onChange(nextValue)
      }}
      onValueChange={(institution) => {
        if (!institution) return
        onChange(institution.name)
      }}
    >
      <ComboboxInput
        className="w-full"
        placeholder="Type university name or acronym (e.g., TUM, LMU, KIT)"
        aria-label="University"
        disabled={disabled}
        showClear
      />
      <ComboboxContent>
        <ComboboxEmpty>No university found.</ComboboxEmpty>
        <ComboboxList>
          {(institution: Institution) => (
            <ComboboxItem key={institution.fullName} value={institution} className="items-start py-2.5">
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{institution.name}</span>
                  {institution.city && <span className="text-xs text-muted-foreground">• {institution.city}</span>}
                </div>
                <span className="truncate text-xs text-muted-foreground">{institution.fullName}</span>
                {institution.country && <span className="text-xs text-muted-foreground/70">{institution.country}</span>}
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

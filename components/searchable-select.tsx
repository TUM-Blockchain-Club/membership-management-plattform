'use client'

import { useState } from 'react'
import { ChevronsUpDownIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'

type Option = { value: string; label: string; description?: string }
export function SearchableSelect({ id, label, value, onChange, options, placeholder = 'Select…', allowCreate = false, disabled, className, searchOptions }: {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  allowCreate?: boolean
  disabled?: boolean
  className?: string
  searchOptions?: (query: string) => Option[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const normalized = query.trim()
  const available = searchOptions ? searchOptions(normalized) : options
  const filtered = searchOptions ? available : available.filter(option => `${option.label} ${option.description ?? ''}`.toLowerCase().includes(normalized.toLowerCase()))
  const exact = available.find(option => option.value.toLowerCase() === normalized.toLowerCase())
  const select = (next: string) => { onChange(next); setOpen(false); setQuery('') }
  return <Popover open={open} onOpenChange={next => { setOpen(next); setQuery('') }}>
    <PopoverTrigger asChild>
      <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} aria-label={label} disabled={disabled} className={cn('w-full justify-between font-normal', className)}>
        <span className="truncate">{options.find(option => option.value === value)?.label || value || placeholder}</span><ChevronsUpDownIcon className="shrink-0 text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-56 max-w-[calc(100vw-2rem)] p-0" align="start">
      <Command shouldFilter={false}>
        <CommandInput aria-label={`Search ${label}`} placeholder={`Search ${label.toLowerCase()}…`} value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>No matches found.</CommandEmpty>
          <CommandGroup>
            {filtered.map((option, index) => <CommandItem key={`${option.value}-${index}`} data-checked={value === option.value} value={`option-${index}`} onSelect={() => select(option.value)}>
              <div className="min-w-0 flex-1"><p className="truncate">{option.label}</p>{option.description && <p className="text-xs text-muted-foreground">{option.description}</p>}</div>
            </CommandItem>)}
            {allowCreate && normalized && !exact && <CommandItem value="create-new-value" onSelect={() => select(normalized)}><PlusIcon />Use “{normalized}” as a new value</CommandItem>}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
}

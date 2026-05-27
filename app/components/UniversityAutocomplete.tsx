'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [inputValue, setInputValue]     = useState(value || '')
  const [suggestions, setSuggestions]   = useState<Institution[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const inputRef    = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // ── Position the portal dropdown under the input ──────────────────────
  const updatePosition = useCallback(() => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top:   rect.bottom + 4,
      left:  rect.left,
      width: rect.width,
      zIndex: 9999,
    })
  }, [])

  // Reposition on scroll / resize while open
  useEffect(() => {
    if (!showDropdown) return
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [showDropdown, updatePosition])

  // Close on click-outside (both input and portal dropdown)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return
      setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setInputValue(v)
    onChange(v)
    setSelectedIndex(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!v) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      const results = searchUniversities(v)
      setSuggestions(results)
      setShowDropdown(results.length > 0)
    }, 200)
  }

  const handleSelect = (inst: Institution) => {
    setInputValue(inst.name)
    onChange(inst.name)
    setShowDropdown(false)
    setSuggestions([])
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(p => p < suggestions.length - 1 ? p + 1 : p)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(p => p > 0 ? p - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) handleSelect(suggestions[selectedIndex])
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleBlur = () => {
    if (inputValue !== value) onChange(inputValue)
  }

  // ── Render ────────────────────────────────────────────────────────────
  const dropdown = showDropdown && suggestions.length > 0 && (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl max-h-72 py-1"
    >
      {suggestions.map((inst, i) => (
        <Button
          key={`${inst.name}-${i}`}
          type="button"
          variant="ghost"
          onMouseDown={(e) => { e.preventDefault(); handleSelect(inst) }}
          onMouseEnter={() => setSelectedIndex(i)}
          className={`h-auto w-full justify-start rounded-none px-4 py-2.5 text-left border-b border-border/50 last:border-b-0 ${
            i === selectedIndex ? 'bg-accent' : ''
          }`}
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-foreground">{inst.name}</span>
              {inst.city && (
                <span className="text-muted-foreground text-xs">• {inst.city}</span>
              )}
            </div>
            <span className="text-muted-foreground text-xs truncate">{inst.fullName}</span>
            {inst.country && (
              <span className="text-muted-foreground/60 text-xs">{inst.country}</span>
            )}
          </div>
        </Button>
      ))}
    </div>
  )

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true) }}
        disabled={disabled}
        placeholder="Type university name or acronym (e.g., TUM, LMU, KIT)"
      />

      {/* Portal: renders at document.body, escaping any overflow:hidden ancestors */}
      {typeof window !== 'undefined' && dropdown
        ? createPortal(dropdown, document.body)
        : null
      }
    </div>
  )
}

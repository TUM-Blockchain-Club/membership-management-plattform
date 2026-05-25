'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  const [inputValue, setInputValue] = useState(value || '')
  const [suggestions, setSuggestions] = useState<Institution[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)
    setSelectedIndex(-1)
    
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }
    
    if (!newValue || newValue.length < 1) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    
    debounceTimeout.current = setTimeout(() => {
      const results = searchUniversities(newValue)
      setSuggestions(results)
      setShowDropdown(results.length > 0)
    }, 200)
  }

  const handleSelectInstitution = (institution: Institution) => {
    setInputValue(institution.name)
    onChange(institution.name)
    setShowDropdown(false)
    setSuggestions([])
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectInstitution(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleBlur = () => {
    if (inputValue !== value) {
      onChange(inputValue)
    }
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowDropdown(true)
          }
        }}
        disabled={disabled}
        placeholder="Type university name or acronym (e.g., TUM, LMU, KIT)"
        className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
      />
      
      {showDropdown && suggestions.length > 0 && (
        <Card
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-gray-900 border-white/20 shadow-2xl max-h-80 overflow-y-auto py-0"
        >
          {suggestions.map((institution, index) => (
            <Button
              key={`${institution.name}-${index}`}
              type="button"
              variant="ghost"
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelectInstitution(institution)
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`h-auto w-full justify-start rounded-none px-4 py-3 text-left transition-colors border-b border-white/5 last:border-b-0 ${
                index === selectedIndex
                  ? 'bg-blue-500/20 border-blue-500/30'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">
                      {institution.name}
                    </span>
                    {institution.city && (
                      <span className="text-white/40 text-xs">
                        • {institution.city}
                      </span>
                    )}
                  </div>
                  <div className="text-white/60 text-xs mt-0.5">
                    {institution.fullName}
                  </div>
                  {institution.country && (
                    <span className="inline-block mt-1 text-white/40 text-xs">
                      {institution.country}
                    </span>
                  )}
                </div>
              </div>
            </Button>
          ))}
        </Card>
      )}
      
      {showDropdown && suggestions.length === 0 && inputValue.length >= 1 && (
        <Card
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-gray-900 border-white/20 shadow-2xl"
        >
          <CardContent className="p-4 text-center text-sm text-white/40">
            No universities found. Try a different search term.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

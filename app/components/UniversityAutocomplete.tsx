'use client'

import { useState, useEffect, useRef } from 'react'
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
    setInputValue(value || '')
  }, [value])

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
    onChange(inputValue)
  }

  return (
    <div className="relative">
      <input
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
        className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-gray-900 border border-white/20 rounded-lg shadow-2xl max-h-80 overflow-y-auto"
        >
          {suggestions.map((institution, index) => (
            <button
              key={`${institution.name}-${index}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelectInstitution(institution)
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full px-4 py-3 text-left transition-colors border-b border-white/5 last:border-b-0 ${
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
            </button>
          ))}
        </div>
      )}
      
      {showDropdown && suggestions.length === 0 && inputValue.length >= 1 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-gray-900 border border-white/20 rounded-lg shadow-2xl p-4"
        >
          <div className="text-white/40 text-sm text-center">
            No universities found. Try a different search term.
          </div>
        </div>
      )}
    </div>
  )
}

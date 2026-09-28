'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  dateTimeParts,
  formatDateValue,
  parseDateValue,
  parseMonthValue,
  withDatePart,
  withTimePart,
} from '@/lib/date-picker-values'
import { cn } from '@/lib/utils'

type PickerProps = {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function DatePicker({
  id,
  value,
  onChange,
  disabled,
  placeholder = 'Pick a date',
  className,
}: PickerProps) {
  const selected = parseDateValue(value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-start text-left font-normal', !selected && 'text-muted-foreground', className)}
        >
          <CalendarIcon data-icon="inline-start" />
          {selected ? format(selected, 'PPP') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => onChange(date ? formatDateValue(date) : '')}
          autoFocus
        />
        {value ? (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange('')}
            >
              Clear date
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function MonthPicker({
  id,
  value,
  onChange,
  disabled,
  placeholder = 'Pick a month',
  className,
}: PickerProps) {
  const selected = parseMonthValue(value)
  const [open, setOpen] = useState(false)
  const [customYear, setCustomYear] = useState<number | null>(null)

  const viewYear = customYear ?? (selected?.getFullYear() ?? new Date().getFullYear())

  const handleYearChange = (delta: number) => {
    setCustomYear((prev) => (prev ?? (selected?.getFullYear() ?? new Date().getFullYear())) + delta)
  }

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen)
      if (!nextOpen) setCustomYear(null)
    }}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-start text-left font-normal', !selected && 'text-muted-foreground', className)}
        >
          <CalendarIcon data-icon="inline-start" />
          {selected ? format(selected, 'MMMM yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => handleYearChange(-1)}
            aria-label="Previous year"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="font-semibold text-sm text-foreground">{viewYear}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => handleYearChange(1)}
            aria-label="Next year"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_LABELS.map((label, index) => {
            const isSelected = selected ? selected.getFullYear() === viewYear && selected.getMonth() === index : false
            const isCurrentMonth =
              new Date().getFullYear() === viewYear && new Date().getMonth() === index

            return (
              <Button
                key={label}
                type="button"
                variant={isSelected ? 'default' : isCurrentMonth ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('h-9 text-xs font-medium', isSelected && 'font-bold')}
                onClick={() => {
                  const monthStr = String(index + 1).padStart(2, '0')
                  onChange(`${viewYear}-${monthStr}`)
                  setOpen(false)
                  setCustomYear(null)
                }}
              >
                {label}
              </Button>
            )
          })}
        </div>
        {value ? (
          <div className="border-t border-border mt-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs h-7 text-muted-foreground hover:text-foreground"
              onClick={() => {
                onChange('')
                setOpen(false)
                setCustomYear(null)
              }}
            >
              Clear month
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

export function DateTimePicker(props: PickerProps) {
  const { date, time } = dateTimeParts(props.value)

  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_8rem] gap-2', props.className)}>
      <DatePicker
        id={props.id}
        value={date}
        onChange={(nextDate) => props.onChange(withDatePart(props.value, nextDate))}
        disabled={props.disabled}
        placeholder={props.placeholder}
      />
      <div className="relative">
        <ClockIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={`${props.id}-time`}
          type="time"
          value={time}
          onChange={(event) => props.onChange(withTimePart(props.value, event.target.value))}
          disabled={props.disabled || !date}
          aria-label="Time"
          className="pl-9"
        />
      </div>
    </div>
  )
}

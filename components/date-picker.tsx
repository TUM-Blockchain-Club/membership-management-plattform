'use client'

import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  dateTimeParts,
  formatDateValue,
  formatMonthValue,
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
  const [year, setYear] = useState(() => selected?.getFullYear() ?? new Date().getFullYear())
  const initialMonthButton = useRef<HTMLButtonElement>(null)

  return (
    <Popover open={open} onOpenChange={nextOpen => {
      if (nextOpen) setYear(selected?.getFullYear() ?? new Date().getFullYear())
      setOpen(nextOpen)
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
      <PopoverContent className="w-72 p-3" align="start" aria-label="Choose month" onOpenAutoFocus={event => {
        event.preventDefault()
        initialMonthButton.current?.focus()
      }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous year" disabled={year <= 100} onClick={() => setYear(year - 1)}><ChevronLeftIcon /></Button>
          <span className="text-sm font-semibold tabular-nums" aria-live="polite">{year}</span>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Next year" disabled={year >= 9999} onClick={() => setYear(year + 1)}><ChevronRightIcon /></Button>
        </div>
        <div className="grid grid-cols-3 gap-1" role="group" aria-label="Months">
          {Array.from({ length: 12 }, (_, month) => {
            const date = new Date(year, month, 1)
            const isSelected = selected?.getFullYear() === year && selected.getMonth() === month
            return <Button
              key={month}
              ref={month === (selected?.getMonth() ?? 0) ? initialMonthButton : undefined}
              type="button"
              variant={isSelected ? 'default' : 'ghost'}
              aria-label={format(date, 'MMMM yyyy')}
              aria-pressed={isSelected}
              onClick={() => { onChange(formatMonthValue(date)); setOpen(false) }}
            >{format(date, 'MMM')}</Button>
          })}
        </div>
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

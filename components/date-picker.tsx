'use client'

import { format } from 'date-fns'
import { CalendarIcon, ClockIcon } from 'lucide-react'
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
          {selected ? format(selected, 'MMMM yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          onSelect={(date) => onChange(date ? formatMonthValue(date) : '')}
          autoFocus
        />
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


import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export function SearchIcon(props: IconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <circle cx="11" cy="11" r="7" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

export function ArrowUpDownIcon(props: IconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M12 4v16" strokeLinecap="round" strokeWidth="2" />
      <path d="m8 8 4-4 4 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m8 16 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

export function HexagonIcon(props: IconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path
        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

export function XIcon(props: IconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M18 6 6 18" strokeLinecap="round" strokeWidth="2" />
      <path d="m6 6 12 12" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <path d="M12 7v6l4 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M12 9v4" strokeLinecap="round" strokeWidth="2" />
      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

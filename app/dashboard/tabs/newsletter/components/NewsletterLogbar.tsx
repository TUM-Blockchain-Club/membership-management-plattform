'use client'

import type { LogEntry } from './types'

type Props = {
  logs: LogEntry[]
}

const typeColors: Record<LogEntry['type'], string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-white/40',
}

export function NewsletterLogbar({ logs }: Props) {
  return (
    <div className="shrink-0 h-7 bg-[#15151f] border-t border-[#2a2a3e] flex items-center overflow-hidden">
      <div className="flex items-center gap-3.5 px-3.5 overflow-hidden w-full">
        <span className="text-[9px] text-[#4a4a60] uppercase tracking-widest shrink-0">Log</span>
        <div className="flex items-center gap-3.5 overflow-hidden flex-1 min-w-0">
          {logs.slice(0, 6).map((entry) => (
            <span
              key={entry.id}
              className={`flex items-center gap-1 text-[10px] whitespace-nowrap ${typeColors[entry.type]}`}
            >
              <span className="text-[#4a4a60] text-[9px]">
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {entry.message}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

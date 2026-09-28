// Separator components — clean, minimal, no coloured gradients.
// The `gradient` and `color` props are kept for API compatibility but ignored.

export function SeparatorLine({
  title,
  wrapperClassName,
}: {
  title?: string
  gradient?: boolean
  color?: string
  wrapperClassName?: string
}) {
  return (
    <div className={wrapperClassName ?? 'mb-10 mt-12'}>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        {title && (
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 shrink-0">
            {title}
          </span>
        )}
        <div className="flex-1 h-px bg-border" />
      </div>
    </div>
  )
}

export function SubSeparatorLine({ wrapperClassName }: { wrapperClassName?: string }) {
  return (
    <div className={wrapperClassName ?? 'mb-8 mt-8'}>
      <div className="h-px bg-border/50" />
    </div>
  )
}

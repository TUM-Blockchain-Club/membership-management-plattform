export function SeparatorLine({ title, gradient = false, color = 'purple' }: { title?: string; gradient?: boolean; color?: 'purple' | 'cyan' | 'blue' }) {
  const colorSchemes = {
    purple: {
      lineLeft: 'bg-gradient-to-r from-transparent via-purple-500/50 to-blue-500/50',
      lineRight: 'bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-transparent',
      background: 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30',
      text: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-blue-300'
    },
    cyan: {
      lineLeft: 'bg-gradient-to-r from-transparent via-cyan-500/50 to-blue-500/50',
      lineRight: 'bg-gradient-to-r from-blue-500/50 via-cyan-500/50 to-transparent',
      background: 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30',
      text: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300'
    },
    blue: {
      lineLeft: 'bg-gradient-to-r from-transparent via-blue-500/50 to-purple-500/50',
      lineRight: 'bg-gradient-to-r from-purple-500/50 via-blue-500/50 to-transparent',
      background: 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30',
      text: 'text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300'
    }
  }

  const scheme = gradient ? colorSchemes[color] : null

  return (
    <div className="mb-10 mt-12">
      <div className="flex items-center gap-4">
        <div className={`h-0.5 flex-1 ${gradient ? scheme!.lineLeft : 'bg-gradient-to-r from-transparent via-white/30 to-white/30'}`} />
        {title && (
          <div className={`px-4 py-2 rounded-lg border backdrop-blur-sm ${
            gradient
              ? scheme!.background
              : 'bg-white/5 border-white/20'
          }`}>
            <span className={`font-semibold ${gradient ? scheme!.text : 'text-white/80'}`}>
              {title}
            </span>
          </div>
        )}
        <div className={`h-0.5 flex-1 ${gradient ? scheme!.lineRight : 'bg-gradient-to-r from-white/30 via-white/30 to-transparent'}`} />
      </div>
    </div>
  )
}

export function SubSeparatorLine() {
  return (
    <div className="mb-8 mt-8">
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-white/10" />
        <div className="w-2 h-2 rounded-full bg-white/20" />
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/10 to-transparent" />
      </div>
    </div>
  )
}

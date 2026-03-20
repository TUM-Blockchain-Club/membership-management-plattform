export function QuickNavigation({ sections }: { sections: Array<{ id: string; label: string; visible: boolean; color?: string }> }) {
  const visibleSections = sections.filter(s => s.visible)

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (visibleSections.length <= 1) return null

  const dotColorMap: Record<string, string> = {
    yellow: 'bg-yellow-400',
    blue: 'bg-blue-400',
    amber: 'bg-amber-400',
    emerald: 'bg-emerald-400',
    indigo: 'bg-indigo-400',
    gray: 'bg-white/40',
  }

  return (
    <div className="fixed left-8 top-1/2 -translate-y-1/2 z-40 hidden 2xl:block">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl" />

        <div className="relative bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
          <div className="text-white/50 text-[10px] uppercase tracking-widest font-semibold mb-4 px-1">
            Quick Nav
          </div>

          <div className="space-y-1">
            {visibleSections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="group w-full px-3 py-2.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center gap-3"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${dotColorMap[section.color || 'gray']} group-hover:scale-150 transition-transform duration-200`} />
                <span className="group-hover:translate-x-0.5 transition-transform duration-200">{section.label}</span>
              </button>
            ))}
          </div>

          <div className="my-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group w-full px-3 py-2.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>Back to Top</span>
          </button>
        </div>
      </div>
    </div>
  )
}

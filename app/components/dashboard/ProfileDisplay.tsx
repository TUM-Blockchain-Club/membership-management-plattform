import { ProfileSection } from './types'

export function ProfileDisplay({ sections }: { sections: ProfileSection[] }) {
  return (
    <div className="space-y-6">{sections.map((section, idx) => (
      <div key={idx} className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-blue-400">{section.icon}</div>
          <h4 className="text-lg font-semibold text-white">{section.title}</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {section.fields.map((field, fieldIdx: number) => (
            <div key={fieldIdx} className="space-y-1">
              <p className="text-white/50 text-xs uppercase tracking-wider font-medium">{field.label}</p>
              <div className="text-white text-sm">{field.value || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    ))}
    </div>
  )
}

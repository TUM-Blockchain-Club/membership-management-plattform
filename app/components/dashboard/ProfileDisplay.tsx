import { ProfileSection } from './types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ProfileDisplay({ sections }: { sections: ProfileSection[] }) {
  return (
    <div className="flex flex-col gap-6">{sections.map((section, idx) => (
      <Card key={idx} className="bg-white/[0.02]">
        <CardHeader className="flex-row items-center gap-2">
          <div className="text-blue-400">{section.icon}</div>
          <CardTitle className="text-lg font-semibold text-white">{section.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {section.fields.map((field, fieldIdx: number) => (
            <div key={fieldIdx} className="flex flex-col gap-1">
              <p className="text-white/50 text-xs uppercase tracking-wider font-medium">{field.label}</p>
              <div className="text-white text-sm">{field.value ?? '—'}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    ))}
    </div>
  )
}

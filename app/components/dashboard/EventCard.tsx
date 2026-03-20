export function EventCard({
  title,
  date,
  time,
  location,
  description,
  organizer,
  maxAttendees,
  currentAttendees,
  hasApplyButton,
  isApplied,
  color,
  onApply,
  showParticipantsButton,
  onViewParticipants
}: {
  title: string
  date: string
  time: string
  location: string
  description: string
  organizer: string
  maxAttendees: number | null
  currentAttendees: number | null
  hasApplyButton: boolean
  isApplied: boolean
  color: string
  onApply?: () => void
  showParticipantsButton?: boolean
  onViewParticipants?: () => void
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/40',
    green: 'from-green-500/20 to-green-600/20 border-green-500/40',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/40',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/40',
    cyan: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/40',
    pink: 'from-pink-500/20 to-pink-600/20 border-pink-500/40'
  }

  const buttonColorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    green: 'bg-green-600 hover:bg-green-700 text-white',
    purple: 'bg-purple-600 hover:bg-purple-700 text-white',
    orange: 'bg-orange-600 hover:bg-orange-700 text-white',
    cyan: 'bg-cyan-600 hover:bg-cyan-700 text-white',
    pink: 'bg-pink-600 hover:bg-pink-700 text-white'
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} border backdrop-blur-md rounded-xl p-6 hover:border-white/30 transition-all duration-200 relative`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2 relative">{title}</h3>
          <div className="space-y-1 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {date}
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {time}
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {location}
            </div>
          </div>
        </div>
        {showParticipantsButton && onViewParticipants && (
          <button
            onClick={onViewParticipants}
            className="ml-3 p-1 text-white/60 hover:text-white transition-colors"
            title="View participants"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}
      </div>

      <p className="text-white/80 text-sm mb-4 leading-relaxed">{description}</p>

      <div className="flex items-center justify-between text-xs text-white/60 mb-4">
        <span>Organized by: {organizer}</span>
        {maxAttendees && <span>{currentAttendees || 0}/{maxAttendees} attending</span>}
      </div>

      {hasApplyButton && (
        <button
          onClick={onApply}
          className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            isApplied ? 'bg-red-600 hover:bg-red-700 text-white' : buttonColorClasses[color as keyof typeof buttonColorClasses]
          }`}
        >
          {isApplied ? 'Deregister' : 'Apply Now'}
        </button>
      )}
    </div>
  )
}

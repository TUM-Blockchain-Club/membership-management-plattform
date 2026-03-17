import { DashboardMember } from './types'

export function MemberCard({ member, getPictureUrl, isHonorary = false, isAlumni = false, isAdvisor = false, canEdit = false, isOwnProfile = false, onEdit }: {
  member: DashboardMember;
  getPictureUrl: (pic: unknown) => string | null;
  isHonorary?: boolean;
  isAlumni?: boolean;
  isAdvisor?: boolean;
  canEdit?: boolean;
  isOwnProfile?: boolean;
  onEdit?: () => void;
}) {
  const isBoardMember = member?.Role === 'Board Member'
  const isCoreMember = member?.Role === 'Core Member'

  return (
    <div className={`backdrop-blur-md border rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 hover:border-white/30 transition-all duration-200 relative overflow-hidden ${
      isBoardMember
        ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/40 shadow-lg shadow-yellow-500/10'
        : isHonorary
        ? 'bg-gradient-to-br from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30'
        : isAlumni
        ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30'
        : isAdvisor
        ? 'bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30'
        : isCoreMember
        ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30'
        : 'bg-white/5 border-white/10'
    }`}>
      {isHonorary && (
        <>
          <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-amber-400/10 rounded-full blur-xl" />
          <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 bg-yellow-400/10 rounded-full blur-xl" />
        </>
      )}

      {isAlumni && (
        <>
          <div className="absolute top-0 left-0 w-20 h-20 sm:w-24 sm:h-24 bg-emerald-400/10 rounded-full blur-xl" />
          <div className="absolute bottom-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-teal-400/10 rounded-full blur-xl" />
        </>
      )}

      {isAdvisor && (
        <>
          <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-indigo-400/10 rounded-full blur-xl" />
          <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-20 sm:h-20 bg-violet-400/10 rounded-full blur-xl" />
        </>
      )}

      {isBoardMember && (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
          <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-yellow-400 text-[10px] sm:text-xs font-semibold hidden sm:inline">Board</span>
          </div>
        </div>
      )}

      {isHonorary && (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
          <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-amber-500/30 border border-amber-400/50 rounded-full backdrop-blur-sm">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-amber-200 text-[10px] sm:text-xs font-semibold hidden sm:inline">Honorary</span>
          </div>
        </div>
      )}

      {isAlumni && (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
          <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-emerald-500/30 border border-emerald-400/50 rounded-full backdrop-blur-sm">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 20 20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span className="text-emerald-200 text-[10px] sm:text-xs font-semibold hidden sm:inline">Alumni</span>
          </div>
        </div>
      )}

      {isAdvisor && (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
          <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-indigo-500/30 border border-indigo-400/50 rounded-full backdrop-blur-sm">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 20 20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-indigo-200 text-[10px] sm:text-xs font-semibold hidden sm:inline">Advisor</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 md:gap-4 relative z-0">
        <div className="flex-shrink-0">
          {getPictureUrl(member?.Picture) ? (
            <img
              src={getPictureUrl(member?.Picture) || ''}
              alt={member?.Name || 'Member'}
              className={`w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full object-cover border-2 ${
                isBoardMember ? 'border-yellow-500/60' : isHonorary ? 'border-amber-400/60 shadow-lg shadow-amber-500/30' : isAlumni ? 'border-emerald-400/60 shadow-lg shadow-emerald-500/30' : isAdvisor ? 'border-indigo-400/60 shadow-lg shadow-indigo-500/30' : isCoreMember ? 'border-blue-500/60' : 'border-white/20'
              }`}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}
          <div className={`w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br ${
            isBoardMember ? 'from-yellow-500 to-orange-600' : isHonorary ? 'from-amber-400 to-yellow-500' : isAlumni ? 'from-emerald-400 to-teal-500' : isAdvisor ? 'from-indigo-400 to-violet-500' : isCoreMember ? 'from-blue-500 to-purple-600' : 'from-blue-500 to-purple-600'
          } flex items-center justify-center border-2 ${
            isBoardMember ? 'border-yellow-500/60' : isHonorary ? 'border-amber-400/60 shadow-lg shadow-amber-500/30' : isAlumni ? 'border-emerald-400/60 shadow-lg shadow-emerald-500/30' : isAdvisor ? 'border-indigo-400/60 shadow-lg shadow-indigo-500/30' : isCoreMember ? 'border-blue-500/60' : 'border-white/20'
          } ${getPictureUrl(member?.Picture) ? 'hidden' : ''}`}>
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-white">
              {member?.Name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left w-full sm:w-auto">
          <h3 className={`text-sm sm:text-base md:text-lg font-semibold truncate ${isHonorary ? 'text-amber-100' : isAlumni ? 'text-emerald-100' : isAdvisor ? 'text-indigo-100' : 'text-white'}`}>{member?.Name}</h3>
          <p className={`text-xs sm:text-sm truncate font-medium ${isBoardMember ? 'text-yellow-400' : isHonorary ? 'text-amber-300' : isAlumni ? 'text-emerald-300' : isAdvisor ? 'text-indigo-300' : isCoreMember ? 'text-blue-400' : 'text-white/60'}`}>{member?.Role}</p>
          <div className="mt-1.5 sm:mt-2 flex flex-wrap gap-1 sm:gap-2 justify-center sm:justify-start">
            <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${member?.Status === 'Active' ? 'bg-green-500/20 border border-green-500/40 text-green-400' : isHonorary ? 'bg-amber-500/30 border border-amber-400/50 text-amber-300' : isAlumni ? 'bg-emerald-500/30 border border-emerald-400/50 text-emerald-300' : isAdvisor ? 'bg-indigo-500/30 border border-indigo-400/50 text-indigo-300' : 'bg-gray-500/20 border border-gray-500/40 text-gray-400'}`}>
              {member?.Status}
            </span>
            {member?.Department && (
              <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium truncate max-w-full ${isHonorary ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : isAlumni ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : isAdvisor ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300' : 'bg-purple-500/20 border border-purple-500/40 text-purple-400'}`}>
                {member?.Department}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10 relative z-0">
        <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-2">
          <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
            <p className={`text-[10px] sm:text-xs ${isHonorary || isAlumni || isAdvisor ? 'text-white/50' : 'text-white/40'}`}>Email</p>
            <p className={`text-xs sm:text-sm truncate ${isHonorary ? 'text-amber-100' : isAlumni ? 'text-emerald-100' : isAdvisor ? 'text-indigo-100' : 'text-white'}`}>
              {member?.['TBC Email']}
            </p>
          </div>
          {canEdit && onEdit && (
            <button
              onClick={onEdit}
              className={`w-full sm:w-auto sm:ml-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1 ${isOwnProfile ? 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 hover:text-blue-200' : 'bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200'}`}
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="hidden sm:inline">{isOwnProfile ? 'My Profile' : 'Edit'}</span>
              <span className="sm:hidden">{isOwnProfile ? 'Me' : 'Edit'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

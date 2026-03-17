import { EditableProfileForm, ProfileDisplay } from '@/app/components/dashboard'

export function ProfileTab({
  viewedMember,
  member,
  editing,
  editedMember,
  creatingMember,
  uploadingImage,
  hasSpecialAccess,
  sections,
  saving,
  canEditField,
  getPictureUrl,
  handleBackToMyProfile,
  handleEditClick,
  handleSave,
  handleCancel,
  handleInputChange,
  setUploadingImage,
  setSelectedImageFile,
  setEditedMember,
}: {
  viewedMember: any
  member: any
  editing: boolean
  editedMember: any
  creatingMember: boolean
  uploadingImage: boolean
  hasSpecialAccess: boolean
  sections: any[]
  saving: boolean
  canEditField: any
  getPictureUrl: (picture: unknown) => string | null
  handleBackToMyProfile: () => void
  handleEditClick: () => void
  handleSave: () => void
  handleCancel: () => void
  handleInputChange: (field: string, value: string | number | null) => void
  setUploadingImage: (value: boolean) => void
  setSelectedImageFile: (file: File | null) => void
  setEditedMember: React.Dispatch<React.SetStateAction<any>>
}) {
  return (
    <div className="max-w-4xl mx-auto">
      {viewedMember && member && viewedMember.id !== member.id && (
        <div className="mb-3 sm:mb-4">
          <button
            onClick={handleBackToMyProfile}
            className="px-3 sm:px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-300 hover:text-blue-200 text-xs sm:text-sm transition-all duration-200 flex items-center gap-1.5 sm:gap-2"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Back to My Profile</span>
            <span className="sm:hidden">Back</span>
          </button>
        </div>
      )}

      <div className={`backdrop-blur-md border rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 relative overflow-hidden ${
        viewedMember?.Role === 'Board Member'
          ? 'bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-yellow-500/10 border-yellow-500/30'
          : viewedMember?.Role === 'Core Member'
          ? 'bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-blue-500/10 border-blue-500/30'
          : viewedMember?.Status === 'Honorary'
          ? 'bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-500/10 border-amber-500/30'
          : viewedMember?.Status === 'Alumni'
          ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/10 border-emerald-500/30'
          : viewedMember?.Status === 'Advisor'
          ? 'bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-indigo-500/10 border-indigo-500/30'
          : 'bg-white/5 border-white/10'
      }`}>
        <div className={`absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 opacity-20 blur-3xl ${
          viewedMember?.Role === 'Board Member'
            ? 'bg-yellow-500'
            : viewedMember?.Role === 'Core Member'
            ? 'bg-blue-500'
            : viewedMember?.Status === 'Honorary'
            ? 'bg-amber-500'
            : viewedMember?.Status === 'Alumni'
            ? 'bg-emerald-500'
            : viewedMember?.Status === 'Advisor'
            ? 'bg-indigo-500'
            : 'bg-purple-500'
        }`} />

        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 relative z-10">
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            <div className="relative group">
              {getPictureUrl(editing && editedMember ? editedMember.Picture : viewedMember?.Picture) ? (
                <img
                  src={getPictureUrl(editing && editedMember ? editedMember.Picture : viewedMember?.Picture) || ''}
                  alt={viewedMember?.Name}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 ${
                    viewedMember?.Role === 'Board Member'
                      ? 'border-yellow-500/50'
                      : viewedMember?.Role === 'Core Member'
                      ? 'border-blue-500/50'
                      : viewedMember?.Status === 'Honorary'
                      ? 'border-amber-500/50'
                      : viewedMember?.Status === 'Alumni'
                      ? 'border-emerald-500/50'
                      : viewedMember?.Status === 'Advisor'
                      ? 'border-indigo-500/50'
                      : 'border-white/20'
                  }`}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
              ) : null}
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border-2 ${
                viewedMember?.Role === 'Board Member'
                  ? 'bg-gradient-to-br from-yellow-500 to-orange-600 border-yellow-500/50'
                  : viewedMember?.Role === 'Core Member'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-blue-500/50'
                  : viewedMember?.Status === 'Honorary'
                  ? 'bg-gradient-to-br from-amber-500 to-yellow-600 border-amber-500/50'
                  : viewedMember?.Status === 'Alumni'
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-500/50'
                  : viewedMember?.Status === 'Advisor'
                  ? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-500/50'
                  : 'bg-gradient-to-br from-blue-500 to-purple-600 border-white/20'
              } ${getPictureUrl(editing && editedMember ? editedMember.Picture : viewedMember?.Picture) ? 'hidden' : ''}`}>
                <span className="text-2xl sm:text-3xl font-bold text-white">
                  {viewedMember?.Name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </span>
              </div>

              {editing && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingImage ? (
                    <svg className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return

                      setUploadingImage(true)
                      setSelectedImageFile(file)

                      const reader = new FileReader()
                      reader.onloadend = () => {
                        setEditedMember((prev: any) => ({
                          ...prev,
                          Picture: reader.result,
                        }))
                        setUploadingImage(false)
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between mb-1 gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white break-words">{viewedMember?.Name}</h2>
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                {hasSpecialAccess && viewedMember?.id === member?.id && (
                  <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border backdrop-blur-sm ${
                    viewedMember?.Role === 'Board Member'
                      ? 'bg-yellow-500/30 border-yellow-400/60'
                      : viewedMember?.Role === 'Core Member'
                      ? 'bg-blue-500/30 border-blue-400/60'
                      : 'bg-purple-500/30 border-purple-400/60'
                  }`}>
                    <svg className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                      viewedMember?.Role === 'Board Member'
                        ? 'text-yellow-300'
                        : viewedMember?.Role === 'Core Member'
                        ? 'text-blue-300'
                        : 'text-purple-300'
                    }`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className={`text-xs font-semibold ${
                      viewedMember?.Role === 'Board Member'
                        ? 'text-yellow-200'
                        : viewedMember?.Role === 'Core Member'
                        ? 'text-blue-200'
                        : 'text-purple-200'
                    }`}>Admin</span>
                  </div>
                )}
                {viewedMember?.Role === 'Board Member' && (
                  <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-lg">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-yellow-300 text-xs font-semibold">Board</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-white/60 text-xs sm:text-sm mb-2 sm:mb-3 break-all">{viewedMember?.['TBC Email']}</p>

            {!creatingMember && (
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium border ${
                  viewedMember?.Role === 'Board Member'
                    ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
                    : viewedMember?.Role === 'Core Member'
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                }`}>
                  {viewedMember?.Role}
                </span>

                <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium border ${
                  viewedMember?.Status === 'Active'
                    ? 'bg-green-500/20 border-green-500/40 text-green-300'
                    : viewedMember?.Status === 'Honorary'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : viewedMember?.Status === 'Alumni'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : viewedMember?.Status === 'Advisor'
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-gray-500/20 border-gray-500/40 text-gray-300'
                }`}>
                  <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1.5 sm:mr-2 ${
                    viewedMember?.Status === 'Active'
                      ? 'bg-green-400 shadow-lg shadow-green-400/50'
                      : viewedMember?.Status === 'Honorary'
                      ? 'bg-amber-400 shadow-lg shadow-amber-400/50'
                      : viewedMember?.Status === 'Alumni'
                      ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                      : viewedMember?.Status === 'Advisor'
                      ? 'bg-indigo-400 shadow-lg shadow-indigo-400/50'
                      : 'bg-gray-400'
                  }`} />
                  {viewedMember?.Status}
                </span>

                {viewedMember?.Department && (
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 border border-white/20 rounded-lg text-white/80 text-xs sm:text-sm font-medium">
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="truncate">{viewedMember?.Department}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden">
        <div className="border-b border-white/10 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-white">Profile Information</h3>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            {!editing ? (
              <button
                onClick={handleEditClick}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded-lg transition-colors duration-200 flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Edit</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white text-xs sm:text-sm rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="hidden sm:inline">Saving...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="hidden sm:inline">Save Changes</span>
                      <span className="sm:hidden">Save</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white text-xs sm:text-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden sm:inline">Cancel</span>
                  <span className="sm:hidden">Cancel</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 md:p-8">
          {editing ? (
            <EditableProfileForm
              member={editedMember}
              onInputChange={handleInputChange}
              onSave={handleSave}
              isBoardMember={member?.Role === 'Board Member'}
              isOwnProfile={viewedMember?.id === member?.id}
              canEditField={canEditField}
            />
          ) : (
            <ProfileDisplay sections={sections} />
          )}
        </div>
      </div>
    </div>
  )
}

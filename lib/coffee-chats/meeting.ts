import type { Database } from '@/lib/types/database.types'

type PairUpdate = Database['public']['Tables']['cc_pairs']['Update']
type SignOffField = 'person1_signed_off' | 'person2_signed_off' | 'person3_signed_off'

export type MeetingUpdateInput = {
  intent: 'complete-meeting' | 'upload-selfie'
  signOffField: SignOffField
  selfiePath: string | null
  driveUrl: string | null
  dateMet: string | null
  rating: number | null
  highlightNote: string | null
}

export function buildMeetingUpdate(input: MeetingUpdateInput): PairUpdate {
  const update: PairUpdate = {}

  if (input.intent === 'complete-meeting') {
    update[input.signOffField] = true
    update.status = 'met'
    if (input.dateMet) update.date_met = input.dateMet
    if (input.rating !== null) update.rating = input.rating
    if (input.highlightNote) update.highlight_note = input.highlightNote
  }

  if (input.selfiePath) update.selfie_path = input.selfiePath
  if (input.driveUrl) update.drive_url = input.driveUrl

  return update
}


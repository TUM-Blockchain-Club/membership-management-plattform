export type CoffeeChatExperienceState = {
  hasMatch: boolean
  isProfileComplete: boolean
  isSignedUp: boolean
  matchIsComplete: boolean
  roundIsOpen: boolean
}

export type CoffeeChatNextStep = {
  kind: 'preferences' | 'join' | 'waiting' | 'match' | 'completed' | 'idle'
  label: string
  href: string | null
}

export function getCoffeeChatNextStep(
  state: CoffeeChatExperienceState,
): CoffeeChatNextStep {
  if (!state.isProfileComplete) {
    return {
      kind: 'preferences',
      label: 'Set matching preferences',
      href: '/coffee-chats/setup',
    }
  }

  if (state.hasMatch && !state.matchIsComplete) {
    return { kind: 'match', label: 'Meet your match', href: null }
  }

  if (state.roundIsOpen && !state.isSignedUp) {
    return { kind: 'join', label: 'Join this round', href: null }
  }

  if (state.isSignedUp) {
    return { kind: 'waiting', label: 'Waiting for your match', href: null }
  }

  if (state.hasMatch && state.matchIsComplete) {
    return { kind: 'completed', label: 'Meeting completed', href: null }
  }

  return { kind: 'idle', label: 'No round is open', href: null }
}

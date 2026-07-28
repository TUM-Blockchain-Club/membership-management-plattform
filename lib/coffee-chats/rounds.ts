type SignupRound = {
  status: string
  signupDeadline: string | null
}

export function getSignupError(round: SignupRound, now = new Date()): string | null {
  if (round.status !== 'open') {
    return 'This round is not open for signup.'
  }

  if (round.signupDeadline && new Date(round.signupDeadline).getTime() <= now.getTime()) {
    return 'The signup deadline for this round has passed.'
  }

  return null
}

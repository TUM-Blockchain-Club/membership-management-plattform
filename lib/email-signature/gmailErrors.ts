// Classifies Gmail API error responses so the app can tell a disabled Gmail API
// (a Google Cloud setup problem) apart from a missing or expired user grant.
// Pure and server/client neutral so tests can import it.

export type GmailFailureKind = 'api_disabled' | 'insufficient_scope' | 'unauthenticated' | 'other'

export type GmailFailure = {
  kind: GmailFailureKind
  status: number
  // Google's machine-readable reasons, for server logs. Never contains the token.
  reasons: string[]
}

type GoogleErrorBody = {
  error?: {
    status?: unknown
    errors?: Array<{ reason?: unknown }>
    details?: Array<{ reason?: unknown }>
  }
}

const API_DISABLED_REASONS = new Set(['SERVICE_DISABLED', 'accessNotConfigured'])
const SCOPE_REASONS = new Set(['ACCESS_TOKEN_SCOPE_INSUFFICIENT', 'insufficientPermissions'])

export const classifyGmailFailure = (status: number, body: unknown): GmailFailure => {
  const error = (body as GoogleErrorBody | null)?.error
  const reasons = [
    ...(error?.details ?? []).map((detail) => detail?.reason),
    ...(error?.errors ?? []).map((entry) => entry?.reason),
    error?.status,
  ].filter((reason): reason is string => typeof reason === 'string' && reason.length > 0)

  const kind: GmailFailureKind = reasons.some((reason) => API_DISABLED_REASONS.has(reason))
    ? 'api_disabled'
    : reasons.some((reason) => SCOPE_REASONS.has(reason))
      ? 'insufficient_scope'
      : status === 401
        ? 'unauthenticated'
        : status === 403
          // A bare 403 without a recognised reason is most often a missing grant.
          ? 'insufficient_scope'
          : 'other'

  return { kind, status, reasons: [...new Set(reasons)] }
}

export const GMAIL_FAILURE_RESPONSES: Record<GmailFailureKind, { message: string; status: number }> = {
  api_disabled: {
    message:
      'The Gmail API is not enabled for the Google sign-in app this platform uses. Authorizing again will not help; ask the platform admins to enable it.',
    status: 503,
  },
  insufficient_scope: {
    message:
      'Gmail permission is missing. Authorize Google again and select the Gmail settings permission.',
    status: 403,
  },
  unauthenticated: {
    message: 'Your Google authorization expired. Authorize Google again and retry.',
    status: 403,
  },
  other: {
    message: 'Gmail could not update the signature. Please try again.',
    status: 502,
  },
}

import 'server-only'

import {
  findMatchingSendAsAlias,
  renderEmailSignature,
  type GmailSendAsAlias,
  type SignatureInput,
} from './signature'
import { classifyGmailFailure, GMAIL_FAILURE_RESPONSES } from './gmailErrors'
import { classifyTokenInfo, type GmailScopeCheck } from './scopes'

const GMAIL_SEND_AS_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs'
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'

// Google's granular consent lets members untick the Gmail settings permission
// (AMBER hit this in July 2026). Check the grant right after OAuth so the page can
// ask them to authorize again instead of failing on submit. The token is sent in
// the POST body so it never appears in a URL.
export const checkGmailSettingsScope = async (accessToken: string): Promise<GmailScopeCheck> => {
  try {
    const response = await fetch(GOOGLE_TOKENINFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ access_token: accessToken }),
      cache: 'no-store',
    })
    const payload: unknown = await response.json().catch(() => null)
    return classifyTokenInfo(response.ok, payload)
  } catch {
    return 'unknown'
  }
}

export class GmailSettingsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'GmailSettingsError'
  }
}

// Logs Google's reason server-side (never the token) and maps it to a member-facing
// message. A disabled Gmail API needs an admin, not another authorization.
const gmailError = async (response: Response, step: 'list send-as' | 'update signature') => {
  const body: unknown = await response.json().catch(() => null)
  const failure = classifyGmailFailure(response.status, body)
  console.warn('Gmail settings request failed', {
    step,
    status: failure.status,
    kind: failure.kind,
    reasons: failure.reasons,
  })
  const { message, status } = GMAIL_FAILURE_RESPONSES[failure.kind]
  return new GmailSettingsError(message, status)
}

export const updateGmailSignature = async ({
  accessToken,
  input,
  userEmail,
}: {
  accessToken: string
  input: SignatureInput
  userEmail: string
}) => {
  const headers = { Authorization: `Bearer ${accessToken}` }
  const aliasesResponse = await fetch(GMAIL_SEND_AS_URL, {
    headers,
    cache: 'no-store',
  })

  if (!aliasesResponse.ok) {
    throw await gmailError(aliasesResponse, 'list send-as')
  }

  const payload = await aliasesResponse.json() as { sendAs?: GmailSendAsAlias[] }
  const alias = findMatchingSendAsAlias(payload.sendAs ?? [], userEmail)
  if (!alias?.sendAsEmail) {
    throw new GmailSettingsError(
      'The authorized Google account does not match your platform email address.',
      403,
    )
  }

  const signature = renderEmailSignature(input, alias.sendAsEmail)
  const updateResponse = await fetch(`${GMAIL_SEND_AS_URL}/${encodeURIComponent(alias.sendAsEmail)}`, {
    method: 'PATCH',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ signature }),
    cache: 'no-store',
  })

  if (!updateResponse.ok) {
    throw await gmailError(updateResponse, 'update signature')
  }

  return { email: alias.sendAsEmail }
}

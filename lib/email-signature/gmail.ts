import 'server-only'

import {
  findMatchingSendAsAlias,
  renderEmailSignature,
  type GmailSendAsAlias,
  type SignatureInput,
} from './signature'

const GMAIL_SEND_AS_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs'

export class GmailSettingsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'GmailSettingsError'
  }
}

const gmailError = (status: number) => {
  if (status === 401 || status === 403) {
    return new GmailSettingsError(
      'Gmail permission is missing or expired. Authorize Google again and select the Gmail settings permission.',
      403,
    )
  }

  return new GmailSettingsError('Gmail could not update the signature. Please try again.', 502)
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
    throw gmailError(aliasesResponse.status)
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
    throw gmailError(updateResponse.status)
  }

  return { email: alias.sendAsEmail }
}

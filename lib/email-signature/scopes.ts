import { GMAIL_SETTINGS_SCOPE } from './constants'

export type GmailScopeCheck = 'granted' | 'missing' | 'unknown'

// Google's tokeninfo returns granted scopes as one space-separated string.
export const scopeListIncludesGmailSettings = (scopeList: unknown) =>
  typeof scopeList === 'string' && scopeList.split(/\s+/).includes(GMAIL_SETTINGS_SCOPE)

// Maps a tokeninfo response to a check result. Only an answered request with a
// scope list counts as "missing"; network or Google errors stay "unknown".
export const classifyTokenInfo = (ok: boolean, payload: unknown): GmailScopeCheck => {
  if (!ok || !payload || typeof payload !== 'object') return 'unknown'
  const scope = (payload as { scope?: unknown }).scope
  if (typeof scope !== 'string') return 'unknown'
  return scopeListIncludesGmailSettings(scope) ? 'granted' : 'missing'
}

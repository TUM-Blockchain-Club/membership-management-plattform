// Pure helper: turn whatever a QR code decodes to into the `token` string that
// `/api/attendance/check-in` expects. The board's QR encodes a full URL
// (`${origin}/attendance/check-in?token=<lectureId:code>`), but we stay lenient
// so a bare token or a QR from a different origin still works.

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[A-Z0-9]+$/i

export function parseCheckInToken(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Preferred shape: a check-in URL with a `token` query param.
  try {
    const url = new URL(trimmed)
    const token = url.searchParams.get('token')
    if (token && TOKEN_RE.test(token.trim())) return token.trim()
  } catch {
    // Not a URL — fall through to the bare-token check.
  }

  // Fallback: the QR held the bare `lectureId:code` token directly.
  if (TOKEN_RE.test(trimmed)) return trimmed

  return null
}

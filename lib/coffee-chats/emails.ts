/**
 * Coffee Chats email notifications via Mailgun.
 *
 * Reuses the same Mailgun credentials (MAILGUN_API_KEY, MAILGUN_DOMAIN,
 * MAILGUN_REGION) already used by the newsletter feature.
 */

interface MatchEmailOptions {
  toEmail: string
  toName: string
  partnerName: string
  partnerEmail: string
  thirdPersonName?: string
  thirdPersonEmail?: string
  month: string
  questions: [string, string, string]
  meetDeadline?: string | null
}

interface SignupConfirmOptions {
  toEmail: string
  toName: string
  month: string
  signupDeadline?: string | null
}

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildMailgunAuth(): string {
  const apiKey = process.env.MAILGUN_API_KEY ?? ''
  return 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64')
}

function mailgunBase(): string {
  const region = process.env.MAILGUN_REGION || 'eu'
  return region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN || 'mg.tum-blockchain.com'

  if (!apiKey) {
    throw new Error('MAILGUN_API_KEY is not configured')
  }

  const form = new URLSearchParams()
  form.append('from', 'TBC Coffee Chats <coffechats@mg.tum-blockchain.com>')
  form.append('to', to)
  form.append('subject', subject)
  form.append('html', html)

  const response = await fetch(`${mailgunBase()}/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: buildMailgunAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  if (!response.ok) {
    throw new Error(`Mailgun rejected the message with status ${response.status}`)
  }
}

/**
 * Sends a match notification email to one participant.
 * Call once per participant in the pair/trio.
 */
export async function sendMatchEmail(opts: MatchEmailOptions): Promise<void> {
  const {
    toEmail,
    toName,
    partnerName,
    partnerEmail,
    thirdPersonName,
    thirdPersonEmail,
    month,
    questions,
    meetDeadline,
  } = opts

  const partners = thirdPersonName
    ? `${escapeEmailHtml(partnerName)} (${escapeEmailHtml(partnerEmail)}) and ${escapeEmailHtml(thirdPersonName)} (${escapeEmailHtml(thirdPersonEmail ?? '')})`
    : `${escapeEmailHtml(partnerName)} (${escapeEmailHtml(partnerEmail)})`

  const deadlineText = meetDeadline
    ? `<p>Try to meet before <strong>${escapeEmailHtml(meetDeadline)}</strong>.</p>`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0a0a0a; color:#e5e5e5; margin:0; padding:0; }
  .wrap { max-width:600px; margin:40px auto; background:#141414; border:1px solid #262626; border-radius:12px; padding:32px; }
  h1 { color:#fff; font-size:22px; margin-top:0; }
  h2 { color:#a3a3a3; font-size:14px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px; }
  .card { background:#1f1f1f; border:1px solid #2d2d2d; border-radius:8px; padding:16px 20px; margin:16px 0; }
  .q { color:#d4d4d4; margin:8px 0; }
  .q::before { content:"Q: "; color:#737373; }
  a { color:#60a5fa; }
  .footer { margin-top:32px; color:#525252; font-size:12px; }
</style></head>
<body>
<div class="wrap">
  <h1>Your Coffee Chat for ${escapeEmailHtml(month)}</h1>
  <p>Hi ${escapeEmailHtml(toName)},</p>
  <p>You have been matched with <strong>${partners}</strong> for this month&apos;s TBC Coffee Chat.</p>
  ${deadlineText}
  <div class="card">
    <h2>Ice-breaker questions to get you started</h2>
    <p class="q">${escapeEmailHtml(questions[0])}</p>
    <p class="q">${escapeEmailHtml(questions[1])}</p>
    <p class="q">${escapeEmailHtml(questions[2])}</p>
  </div>
  <p>Once you have met, log your session on the <a href="https://plattform.tum-blockchain.com/coffee-chats/my-match">Coffee Chats platform</a> and upload your selfie for the gallery!</p>
  <div class="footer">TUM Blockchain Club &mdash; plattform.tum-blockchain.com</div>
</div>
</body>
</html>`

  await sendMail(toEmail, `Your TBC Coffee Chat match for ${month}`, html)
}

/**
 * Sends a sign-up confirmation email immediately after a member joins a round.
 */
export async function sendSignupConfirmEmail(opts: SignupConfirmOptions): Promise<void> {
  const { toEmail, toName, month, signupDeadline } = opts

  const deadlineText = signupDeadline
    ? `<p>The signup window closes on <strong>${escapeEmailHtml(signupDeadline)}</strong>. Matches will be sent out shortly after.</p>`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0a0a0a; color:#e5e5e5; margin:0; padding:0; }
  .wrap { max-width:600px; margin:40px auto; background:#141414; border:1px solid #262626; border-radius:12px; padding:32px; }
  h1 { color:#fff; font-size:22px; margin-top:0; }
  a { color:#60a5fa; }
  .footer { margin-top:32px; color:#525252; font-size:12px; }
</style></head>
<body>
<div class="wrap">
  <h1>You&apos;re signed up for Coffee Chats!</h1>
  <p>Hi ${escapeEmailHtml(toName)},</p>
  <p>You have successfully signed up for the <strong>${escapeEmailHtml(month)}</strong> TBC Coffee Chat round.</p>
  ${deadlineText}
  <p>We will email you your match once pairings are done. In the meantime, make sure your <a href="https://plattform.tum-blockchain.com/coffee-chats/setup">Coffee Chat profile</a> is up to date so we can find you the best match.</p>
  <div class="footer">TUM Blockchain Club &mdash; plattform.tum-blockchain.com</div>
</div>
</body>
</html>`

  await sendMail(toEmail, `TBC Coffee Chats ${month} — You&apos;re in!`, html)
}

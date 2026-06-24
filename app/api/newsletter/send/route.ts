import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireNewsletterAccess } from '@/lib/newsletter/auth'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireNewsletterAccess(supabase)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { fromName, fromEmail, toAddress, subject, html, testEmail } = await request.json() as {
      fromName?: string
      fromEmail?: string
      toAddress?: string
      subject?: string
      html?: string
      testEmail?: string
    }

    const sanitize = (s: string | undefined) => s?.replace(/[\r\n]/g, '') ?? ''
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    const cleanFromName = sanitize(fromName)
    const cleanFromEmail = sanitize(fromEmail)
    const cleanSubject = sanitize(subject)

    const apiKey = process.env.MAILGUN_API_KEY
    const domain = process.env.MAILGUN_DOMAIN || 'newsletter.tum-blockchain.com'
    const region = process.env.MAILGUN_REGION || 'eu'

    if (!apiKey) {
      return NextResponse.json({ error: 'Mailgun API key not configured on server.' }, { status: 500 })
    }

    if (!cleanFromEmail || !emailRegex.test(cleanFromEmail)) {
      return NextResponse.json({ error: 'Valid fromEmail is required.' }, { status: 400 })
    }
    if (!cleanSubject || !html) {
      return NextResponse.json({ error: 'subject and html are required.' }, { status: 400 })
    }

    const recipient = testEmail ? sanitize(testEmail) : toAddress ? sanitize(toAddress) : ''
    if (!recipient || !emailRegex.test(recipient)) {
      return NextResponse.json({ error: 'Valid recipient email is required.' }, { status: 400 })
    }

    const base = region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'

    const form = new URLSearchParams()
    form.append('from', cleanFromName ? `${cleanFromName} <${cleanFromEmail}>` : cleanFromEmail)
    form.append('to', recipient)
    form.append('subject', cleanSubject)
    form.append('html', html)

    const authHeader = 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64')

    const response = await fetch(`${base}/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })

    const data = await response.json() as { id?: string; message?: string }
    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Mailgun error' }, { status: response.status })
    }

    return NextResponse.json({ ok: true, id: data.id, message: data.message })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireNewsletterAccess } from '@/lib/newsletter/auth'

async function readMailgunResponse(response: Response) {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text) as { id?: string; message?: string }
  } catch {
    return { message: text }
  }
}

const shouldLogMailgunInfo = () =>
  process.env.NODE_ENV !== 'production' || process.env.NEWSLETTER_DEBUG_LOGS === 'true'

const logMailgunInfo = (event: string, data: Record<string, unknown>) => {
  if (!shouldLogMailgunInfo()) return
  console.info('[newsletter-mailgun]', { event, ...data })
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireNewsletterAccess(supabase, request)
    const debugId = request.headers.get('x-newsletter-request-id') ?? crypto.randomUUID()
    if (auth.status !== 200) {
      console.warn('[newsletter-mailgun]', {
        event: 'send-auth-rejected',
        debugId,
        status: auth.status,
        error: auth.error,
      })
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { fromName, fromEmail, toAddress, subject, html, testEmail, projectId } = await request.json() as {
      fromName?: string
      fromEmail?: string
      toAddress?: string
      subject?: string
      html?: string
      testEmail?: string
      projectId?: string | null
    }

    const sanitize = (s: string | undefined) => s?.replace(/[\r\n]/g, '') ?? ''
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

    const cleanFromName = sanitize(fromName)
    const cleanFromEmail = sanitize(fromEmail)
    const cleanSubject = sanitize(subject)

    const apiKey = process.env.MAILGUN_API_KEY
    const domain = process.env.MAILGUN_DOMAIN || 'mg.tum-blockchain.com'
    const region = process.env.MAILGUN_REGION || 'eu'

    if (!apiKey) {
      console.warn('[newsletter-mailgun]', {
        event: 'send-not-configured',
        debugId,
        hasApiKey: false,
        domain,
        region,
      })
      return NextResponse.json({ error: 'Mailgun API key not configured on server.' }, { status: 500 })
    }

    if (!cleanFromEmail || !emailRegex.test(cleanFromEmail)) {
      console.warn('[newsletter-mailgun]', {
        event: 'send-invalid-from',
        debugId,
        fromEmailPresent: Boolean(cleanFromEmail),
      })
      return NextResponse.json({ error: 'Valid fromEmail is required.' }, { status: 400 })
    }
    if (!cleanSubject || !html) {
      console.warn('[newsletter-mailgun]', {
        event: 'send-invalid-content',
        debugId,
        hasSubject: Boolean(cleanSubject),
        hasHtml: Boolean(html),
      })
      return NextResponse.json({ error: 'subject and html are required.' }, { status: 400 })
    }

    const recipient = testEmail ? sanitize(testEmail) : toAddress ? sanitize(toAddress) : ''
    if (!recipient || !emailRegex.test(recipient)) {
      console.warn('[newsletter-mailgun]', {
        event: 'send-invalid-recipient',
        debugId,
        recipientPresent: Boolean(recipient),
        type: testEmail ? 'test' : 'campaign',
      })
      return NextResponse.json({ error: 'Valid recipient email is required.' }, { status: 400 })
    }

    const base = region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'

    const form = new URLSearchParams()
    form.append('from', cleanFromName ? `${cleanFromName} <${cleanFromEmail}>` : cleanFromEmail)
    form.append('to', recipient)
    form.append('subject', cleanSubject)
    form.append('html', html)

    const authHeader = 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64')

    logMailgunInfo('send-request', {
      debugId,
      domain,
      region,
      type: testEmail ? 'test' : 'campaign',
      fromEmail: cleanFromEmail,
      recipient,
      subjectLength: cleanSubject.length,
      htmlLength: html.length,
    })

    const response = await fetch(`${base}/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })

    const data = await readMailgunResponse(response)
    const responseLog = {
      debugId,
      status: response.status,
      ok: response.ok,
      message: data.message ?? null,
      hasMessageId: Boolean(data.id),
    }

    if (response.ok) {
      logMailgunInfo('send-response', responseLog)
    } else {
      console.warn('[newsletter-mailgun]', { event: 'send-response', ...responseLog })
    }

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Mailgun error' }, { status: response.status })
    }

    const mailgunMessageId = data.id?.replace(/^<|>$/g, '') ?? null
    const { data: delivery, error: deliveryError } = await auth.dataClient
      .from('newsletter_deliveries')
      .insert({
        project_id: projectId ?? null,
        delivery_type: testEmail ? 'test' : 'campaign',
        status: 'sent',
        subject: cleanSubject,
        from_name: cleanFromName || null,
        from_email: cleanFromEmail,
        recipient,
        mailgun_message_id: mailgunMessageId,
        mailgun_message: data.message ?? null,
        created_by: auth.ownerId,
      })
      .select()
      .single()

    if (deliveryError) {
      console.warn('[newsletter-mailgun]', {
        event: 'send-tracking-error',
        debugId,
        message: deliveryError.message,
      })
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      message: data.message,
      delivery: delivery ?? null,
      trackingError: deliveryError?.message,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed'
    console.warn('[newsletter-mailgun]', {
      event: 'send-exception',
      message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireNewsletterAccess } from '@/lib/newsletter/auth'

type MailgunList = {
  address: string
  name?: string
  description?: string
  members_count?: number
  members?: { total?: number }
}

type MailgunListsResponse = {
  items?: MailgunList[]
  message?: string
}

const shouldLogMailgunInfo = () =>
  process.env.NODE_ENV !== 'production' || process.env.NEWSLETTER_DEBUG_LOGS === 'true'

const logMailgunInfo = (event: string, data: Record<string, unknown>) => {
  if (!shouldLogMailgunInfo()) return
  console.info('[newsletter-mailgun]', { event, ...data })
}

async function readMailgunListsResponse(response: Response) {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text) as MailgunListsResponse
  } catch {
    return { message: text }
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireNewsletterAccess(supabase, request)
    if (auth.status !== 200) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const apiKey = process.env.MAILGUN_API_KEY
    const region = process.env.MAILGUN_REGION || 'eu'
    const debugId = request.headers.get('x-newsletter-request-id') ?? crypto.randomUUID()

    if (!apiKey) {
      console.warn('[newsletter-mailgun]', {
        event: 'lists-not-configured',
        debugId,
        hasApiKey: false,
        region,
      })
      return NextResponse.json({ error: 'Mailgun not configured' }, { status: 500 })
    }

    const base = region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
    const authHeader = 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64')

    logMailgunInfo('lists-request', {
      debugId,
      region,
      base,
    })

    const r = await fetch(`${base}/v3/lists/pages?limit=100`, { headers: { Authorization: authHeader } })
    const data = await readMailgunListsResponse(r)

    const responseLog = {
      debugId,
      status: r.status,
      ok: r.ok,
      message: data.message ?? null,
      itemCount: data.items?.length ?? null,
    }

    if (r.ok) {
      logMailgunInfo('lists-response', responseLog)
    } else {
      console.warn('[newsletter-mailgun]', { event: 'lists-response', ...responseLog })
    }

    if (!r.ok) {
      return NextResponse.json({ error: data.message || `Mailgun lists ${r.status}` }, { status: r.status })
    }

    const lists = (data.items ?? []).map((l) => ({
      address: l.address,
      name: l.name ?? '',
      description: l.description ?? '',
      membersCount: l.members_count != null ? l.members_count : (l.members?.total ?? 0),
    }))

    return NextResponse.json({ lists })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch mailing lists'
    console.warn('[newsletter-mailgun]', {
      event: 'lists-exception',
      message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

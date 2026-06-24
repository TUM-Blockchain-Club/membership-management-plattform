import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireNewsletterAccess } from '@/lib/newsletter/auth'

type MailgunEvent = {
  event: string
  recipient: string
  timestamp: number
}

type MailgunEventsResponse = {
  items?: MailgunEvent[]
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireNewsletterAccess(supabase)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 })
    }

    const apiKey = process.env.MAILGUN_API_KEY
    const domain = process.env.MAILGUN_DOMAIN || 'newsletter.tum-blockchain.com'
    const region = process.env.MAILGUN_REGION || 'eu'

    if (!apiKey) {
      return NextResponse.json({ error: 'Mailgun not configured' }, { status: 500 })
    }

    const base = region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
    const cleanId = messageId.replace(/^<|>$/g, '')
    const authHeader = 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64')

    const url = `${base}/v3/${domain}/events?${new URLSearchParams({ 'message-id': cleanId, limit: '10' })}`
    const r = await fetch(url, { headers: { Authorization: authHeader } })

    if (!r.ok) {
      return NextResponse.json({ error: `Mailgun events API ${r.status}` }, { status: r.status })
    }

    const data = await r.json() as MailgunEventsResponse
    const items = (data.items ?? []).map((e) => ({
      event: e.event,
      recipient: e.recipient,
      timestamp: e.timestamp,
    }))

    return NextResponse.json({ items })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get delivery status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

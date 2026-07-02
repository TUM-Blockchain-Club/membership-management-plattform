import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireNewsletterAccess } from '@/lib/newsletter/auth'

type MailgunEvent = {
  event?: string
  recipient?: string
  timestamp?: number
  message?: {
    headers?: {
      'message-id'?: string
    }
  }
}

type MailgunEventsResponse = {
  items?: MailgunEvent[]
  message?: string
}

const getMailgunBaseUrl = () =>
  (process.env.MAILGUN_REGION || 'eu') === 'eu'
    ? 'https://api.eu.mailgun.net'
    : 'https://api.mailgun.net'

const cleanMessageId = (messageId: string) => messageId.trim().replace(/^<|>$/g, '')

const mapEventStatus = (event: string | null) => {
  if (!event) return 'sent'
  if (event === 'failed' || event === 'rejected') return 'failed'
  if (event === 'delivered' || event === 'opened' || event === 'clicked') return 'delivered'
  return 'sent'
}

const summarizeEvents = (events: Array<{ event: string }>) =>
  events.reduce<Record<string, number>>((summary, item) => {
    summary[item.event] = (summary[item.event] ?? 0) + 1
    return summary
  }, {})

async function fetchMailgunEvents(messageId: string) {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN || 'newsletter.tum-blockchain.com'

  if (!apiKey) {
    throw new Error('Mailgun not configured.')
  }

  const url = `${getMailgunBaseUrl()}/v3/${domain}/events?${new URLSearchParams({
    'message-id': cleanMessageId(messageId),
    limit: '50',
  })}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
    },
  })
  const data = await response.json() as MailgunEventsResponse

  if (!response.ok) {
    throw new Error(data.message || `Mailgun events API ${response.status}`)
  }

  return (data.items ?? [])
    .filter((item) => item.event && item.recipient && item.timestamp)
    .map((item) => ({
      event: item.event!,
      recipient: item.recipient!,
      event_timestamp: new Date(item.timestamp! * 1000).toISOString(),
      raw_payload: item as Record<string, unknown>,
    }))
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireNewsletterAccess(supabase, request)
    if (auth.status !== 200) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (messageId) {
      const cleanId = cleanMessageId(messageId)
      const events = await fetchMailgunEvents(cleanId)

      const { data: delivery, error: deliveryError } = await auth.dataClient
        .from('newsletter_deliveries')
        .select('*')
        .eq('mailgun_message_id', cleanId)
        .maybeSingle()

      if (deliveryError) {
        return NextResponse.json({ error: deliveryError.message }, { status: 500 })
      }

      if (delivery && events.length > 0) {
        const eventRows = events.map((event) => ({
          ...event,
          delivery_id: delivery.id,
        }))
        const { error: upsertError } = await auth.dataClient
          .from('newsletter_delivery_events')
          .upsert(eventRows, {
            onConflict: 'delivery_id,event,recipient,event_timestamp',
          })

        if (upsertError) {
          return NextResponse.json({ error: upsertError.message }, { status: 500 })
        }

        const latestEvent = [...events].sort((a, b) =>
          b.event_timestamp.localeCompare(a.event_timestamp)
        )[0]

        const { error: updateError } = await auth.dataClient
          .from('newsletter_deliveries')
          .update({
            status: mapEventStatus(latestEvent.event),
            last_event: latestEvent.event,
            last_event_at: latestEvent.event_timestamp,
            event_summary: summarizeEvents(events),
          })
          .eq('id', delivery.id)

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }
      }

      return NextResponse.json({ delivery, events })
    }

    const { data, error } = await auth.dataClient
      .from('newsletter_deliveries')
      .select('id, project_id, delivery_type, status, subject, recipient, mailgun_message_id, mailgun_message, last_event, last_event_at, event_summary, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(25)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ deliveries: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load delivery status.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

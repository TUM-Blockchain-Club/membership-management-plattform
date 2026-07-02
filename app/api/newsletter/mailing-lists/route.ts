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

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireNewsletterAccess(supabase, request)
    if (auth.status !== 200) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const apiKey = process.env.MAILGUN_API_KEY
    const region = process.env.MAILGUN_REGION || 'eu'

    if (!apiKey) {
      return NextResponse.json({ error: 'Mailgun not configured' }, { status: 500 })
    }

    const base = region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
    const authHeader = 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64')

    const r = await fetch(`${base}/v3/lists/pages?limit=100`, { headers: { Authorization: authHeader } })
    const data = await r.json() as MailgunListsResponse
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
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

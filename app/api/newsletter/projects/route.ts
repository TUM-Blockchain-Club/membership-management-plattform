import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireNewsletterAccess } from '@/lib/newsletter/auth'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireNewsletterAccess(supabase)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await supabase
      .from('newsletter_projects')
      .select('id, name, subject, from_name, from_email, to_address, gjs_data, created_at, updated_at')
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ projects: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load projects'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireNewsletterAccess(supabase)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json() as {
      id?: string
      name?: string
      subject?: string
      from_name?: string
      from_email?: string
      to_address?: string
      html?: string
      gjs_data?: object
    }

    const payload = {
      name: body.name || 'Untitled',
      subject: body.subject ?? null,
      from_name: body.from_name ?? null,
      from_email: body.from_email ?? null,
      to_address: body.to_address ?? null,
      html: body.html ?? null,
      gjs_data: body.gjs_data ?? null,
      created_by: auth.user!.id,
    }

    let data, error

    if (body.id) {
      const result = await supabase
        .from('newsletter_projects')
        .update(payload)
        .eq('id', body.id)
        .eq('created_by', auth.user!.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      const result = await supabase
        .from('newsletter_projects')
        .insert(payload)
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ project: data }, { status: body.id ? 200 : 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save project'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

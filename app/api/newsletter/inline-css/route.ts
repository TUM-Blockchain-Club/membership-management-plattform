import { NextResponse } from 'next/server'
import juice from 'juice'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireNewsletterAccess } from '@/lib/newsletter/auth'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireNewsletterAccess(supabase, request)
    if (auth.status !== 200) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { html, css } = await request.json() as { html?: string; css?: string }
    if (!html) {
      return NextResponse.json({ error: 'html is required' }, { status: 400 })
    }

    const source = css ? `<style>${css}</style>${html}` : html
    const inlined = juice(source, {
      removeStyleTags: true,
      preserveImportant: true,
      applyAttributesTableElements: true,
    })

    return NextResponse.json({ html: inlined })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CSS inlining failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendSignupConfirmEmail } from '@/lib/coffee-chats/emails'

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve member row
    const { data: member, error: memberError } = await supabase
      .from('members_main')
      .select('id, Name, "TBC Email"')
      .ilike('"TBC Email"', user.email ?? '')
      .maybeSingle()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member profile not found' }, { status: 404 })
    }

    // Find the current open round
    const { data: round, error: roundError } = await supabase
      .from('cc_rounds')
      .select('id, month, signup_deadline')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (roundError || !round) {
      return NextResponse.json({ error: 'No open round found' }, { status: 404 })
    }

    // Insert signup (UNIQUE constraint handles duplicates gracefully)
    const { error: signupError } = await supabase
      .from('cc_signups')
      .insert({ round_id: round.id, member_id: member.id })

    if (signupError) {
      if (signupError.code === '23505') {
        return NextResponse.json({ ok: true, alreadySignedUp: true })
      }
      return NextResponse.json({ error: signupError.message }, { status: 500 })
    }

    // Send confirmation email (best effort)
    const email = (member['TBC Email'] as string | null) ?? user.email ?? ''
    if (email) {
      await sendSignupConfirmEmail({
        toEmail: email,
        toName: (member.Name as string | null) ?? 'Member',
        month: round.month as string,
        signupDeadline: round.signup_deadline as string | null,
      }).catch((err: unknown) => {
        console.warn('[coffee-chats/signup] confirmation email failed:', err)
      })
    }

    return NextResponse.json({ ok: true, roundId: round.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

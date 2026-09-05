import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCoffeeChatAdminClient } from '@/lib/server/coffeeChats'

async function checkBoardOrSpecialAccess(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, email: string) {
  const { data: specialAccess } = await supabase.rpc('check_email_has_special_access', {
    check_email: email,
  })
  if (specialAccess === true) return true

  const { data: member } = await supabase
    .from('members_main')
    .select('Role')
    .ilike('"TBC Email"', email)
    .maybeSingle()

  return member?.Role === 'Board Member'
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.email ?? ''
    const { data: canAccessAdmin } = await supabase.rpc('check_email_can_manage_coffee_chats', {
      check_email: email,
    })

    if (!canAccessAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const canManageAdmins = await checkBoardOrSpecialAccess(supabase, email)
    const admin = getCoffeeChatAdminClient()
    const client = admin ?? supabase

    const { data: adminRows, error: adminsError } = await client
      .from('cc_admins')
      .select('member_id, assigned_by, created_at')
      .order('created_at', { ascending: false })

    if (adminsError) {
      return NextResponse.json({ error: adminsError.message }, { status: 500 })
    }

    const memberIds = (adminRows ?? []).map((row) => row.member_id as number)
    let memberDetails: Array<{ id: number; Name: string | null; Department: string | null; 'TBC Email': string | null }> = []

    if (memberIds.length > 0) {
      const { data: members } = await client
        .from('members_main')
        .select('id, Name, Department, "TBC Email"')
        .in('id', memberIds)
      memberDetails = (members ?? []) as typeof memberDetails
    }

    const memberMap = new Map(memberDetails.map((m) => [m.id, m]))

    const admins = (adminRows ?? []).map((row) => {
      const details = memberMap.get(row.member_id as number)
      return {
        memberId: row.member_id as number,
        name: details?.Name ?? 'Member',
        department: details?.Department ?? null,
        email: details?.['TBC Email'] ?? null,
        createdAt: row.created_at as string,
        assignedBy: row.assigned_by as number | null,
      }
    })

    return NextResponse.json({
      ok: true,
      admins,
      canManageAdmins,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch admins'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.email ?? ''
    const canManageAdmins = await checkBoardOrSpecialAccess(supabase, email)
    if (!canManageAdmins) {
      return NextResponse.json(
        { error: 'Only board members can assign Coffee Chat administrators.' },
        { status: 403 },
      )
    }

    const { memberId } = (await request.json()) as { memberId?: number }
    if (!memberId || typeof memberId !== 'number') {
      return NextResponse.json({ error: 'Valid memberId is required' }, { status: 400 })
    }

    // Get current user's member ID for assigned_by
    const { data: currentMember } = await supabase
      .from('members_main')
      .select('id')
      .ilike('"TBC Email"', email)
      .maybeSingle()

    const admin = getCoffeeChatAdminClient()
    const client = admin ?? supabase

    const { error: insertError } = await client
      .from('cc_admins')
      .upsert(
        {
          member_id: memberId,
          assigned_by: currentMember?.id ?? null,
        },
        { onConflict: 'member_id' },
      )

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, memberId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to assign admin'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.email ?? ''
    const canManageAdmins = await checkBoardOrSpecialAccess(supabase, email)
    if (!canManageAdmins) {
      return NextResponse.json(
        { error: 'Only board members can remove Coffee Chat administrators.' },
        { status: 403 },
      )
    }

    const { memberId } = (await request.json()) as { memberId?: number }
    if (!memberId || typeof memberId !== 'number') {
      return NextResponse.json({ error: 'Valid memberId is required' }, { status: 400 })
    }

    const admin = getCoffeeChatAdminClient()
    const client = admin ?? supabase

    const { error: deleteError } = await client
      .from('cc_admins')
      .delete()
      .eq('member_id', memberId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, memberId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove admin'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

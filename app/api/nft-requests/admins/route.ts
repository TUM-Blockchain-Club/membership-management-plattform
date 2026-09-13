import { NextResponse } from "next/server"
import { NftRequestAdminError, requireNftRequestAdmin } from "@/lib/server/nftRequestAdmin"
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const handleError = (error: unknown) => {
  if (error instanceof NftRequestAdminError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Could not manage NFT administrators." },
    { status: 500 }
  )
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { member } = await requireNftRequestAdmin(supabase, request)
    const client = getSupabaseAdminClient() ?? supabase
    const { data: assignments, error } = await client
      .from("nft_admins")
      .select("member_id, assigned_by, created_at")
      .order("created_at", { ascending: false })
    if (error) throw error

    const assignedIds = (assignments ?? []).map((row) => Number(row.member_id))
    const { data: assignedMembers, error: membersError } = assignedIds.length
      ? await client
          .from("members_main")
          .select('id, Name, Department, "TBC Email"')
          .in("id", assignedIds)
      : { data: [], error: null }
    if (membersError) throw membersError

    const memberMap = new Map((assignedMembers ?? []).map((row) => [Number(row.id), row]))
    const admins = (assignments ?? []).map((row) => {
      const details = memberMap.get(Number(row.member_id))
      return {
        memberId: Number(row.member_id),
        name: details?.Name ?? "Member",
        department: details?.Department ?? null,
        email: details?.["TBC Email"] ?? null,
        createdAt: row.created_at,
      }
    })

    const canManageAdmins = member.Role?.trim() === "Board Member"
    let availableMembers: Array<{
      id: number
      name: string
      department: string | null
    }> = []

    if (canManageAdmins) {
      const { data: members, error: availableError } = await client
        .from("members_main")
        .select("id, Name, Department, Role")
        .eq("Status", "Active")
        .order("Name", { ascending: true })
      if (availableError) throw availableError

      const assigned = new Set(assignedIds)
      availableMembers = (members ?? [])
        .filter((row) => row.Role?.trim() !== "Board Member" && !assigned.has(Number(row.id)))
        .map((row) => ({
          id: Number(row.id),
          name: row.Name ?? "Member #" + row.id,
          department: row.Department ?? null,
        }))
    }

    return NextResponse.json({ admins, availableMembers, canManageAdmins })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { member } = await requireNftRequestAdmin(supabase, request)
    if (member.Role?.trim() !== "Board Member") {
      return NextResponse.json({ error: "Only board members can assign NFT administrators." }, { status: 403 })
    }

    const { memberId } = (await request.json()) as { memberId?: number }
    if (!Number.isInteger(memberId)) {
      return NextResponse.json({ error: "A valid member is required." }, { status: 400 })
    }

    const client = getSupabaseAdminClient() ?? supabase
    const { data: target, error: targetError } = await client
      .from("members_main")
      .select("id, Role, Status")
      .eq("id", memberId)
      .maybeSingle()
    if (targetError) throw targetError
    if (!target || target.Status !== "Active") {
      return NextResponse.json({ error: "Only active members can be assigned." }, { status: 400 })
    }
    if (target.Role?.trim() === "Board Member") {
      return NextResponse.json({ error: "Board members already have NFT administrator access." }, { status: 400 })
    }

    const { error } = await client.from("nft_admins").upsert(
      { member_id: memberId, assigned_by: member.ID },
      { onConflict: "member_id" }
    )
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { member } = await requireNftRequestAdmin(supabase, request)
    if (member.Role?.trim() !== "Board Member") {
      return NextResponse.json({ error: "Only board members can remove NFT administrators." }, { status: 403 })
    }

    const { memberId } = (await request.json()) as { memberId?: number }
    if (!Number.isInteger(memberId)) {
      return NextResponse.json({ error: "A valid member is required." }, { status: 400 })
    }

    const client = getSupabaseAdminClient() ?? supabase
    const { error } = await client.from("nft_admins").delete().eq("member_id", memberId)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}

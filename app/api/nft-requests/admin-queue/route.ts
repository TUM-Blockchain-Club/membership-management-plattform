import { NextResponse } from "next/server"
import { NftRequestAdminError, requireNftRequestAdmin } from "@/lib/server/nftRequestAdmin"
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type RequestRow = {
  id: string
  member_id: number | string
  status: string
  display_name: string
  fun_facts: string | null
  wallet_address: string | null
  image_path: string
  image_url: string
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_note: string | null
  mint_tx_hash: string | null
}

type MemberSummary = {
  id: number
  name: string | null
  email: string | null
  department: string | null
  picture: unknown | null
}

const normalizeMemberId = (value: number | string) => {
  const normalized = typeof value === "number" ? value : Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

const normalizeMember = (member: Record<string, unknown>): MemberSummary => {
  const rawId = member.ID ?? member.id
  const normalizedId =
    typeof rawId === "number"
      ? rawId
      : typeof rawId === "string"
        ? Number(rawId)
        : 0

  const rawName = member.Name ?? member.name
  const rawEmail = member["TBC Email"] ?? member.tbc_email ?? member.email
  const rawDepartment = member.Department ?? member.department
  const rawPicture = member.Picture ?? member.picture ?? null

  return {
    id: Number.isFinite(normalizedId) ? normalizedId : 0,
    name: typeof rawName === "string" ? rawName.trim() || null : null,
    email: typeof rawEmail === "string" ? rawEmail.trim() || null : null,
    department: typeof rawDepartment === "string" ? rawDepartment.trim() || null : null,
    picture: rawPicture,
  }
}

export async function GET(request: Request) {
  try {
    const authClient = await createSupabaseServerClient()
    await requireNftRequestAdmin(authClient, request)

    const dataClient = getSupabaseAdminClient() ?? authClient

    const { data: requestRows, error: requestError } = await dataClient
      .from("nft_requests")
      .select("id, member_id, status, display_name, fun_facts, wallet_address, image_path, image_url, created_at, reviewed_at, reviewed_by, review_note, mint_tx_hash")
      .order("created_at", { ascending: false })

    if (requestError) {
      return NextResponse.json({ error: requestError.message || "Could not load NFT requests." }, { status: 500 })
    }

    const requests = ((requestRows ?? []) as RequestRow[]).map((request) => ({
      ...request,
      member_id: normalizeMemberId(request.member_id),
    }))

    const memberIds = [...new Set(requests.map((request) => request.member_id))]
    let membersById = new Map<number, MemberSummary>()

    if (memberIds.length > 0) {
      const { data: memberRows, error: memberError } = await dataClient
        .from("Members")
        .select('ID, Name, Picture, Department, "TBC Email"')
        .in("ID", memberIds)

      if (memberError) {
        return NextResponse.json(
          { error: memberError.message || "Could not load member details for NFT requests." },
          { status: 500 }
        )
      }

      membersById = new Map(
        ((memberRows ?? []) as Record<string, unknown>[])
          .map((member) => normalizeMember(member))
          .map((member) => [member.id, member] as const)
      )

      const missingMemberIds = memberIds.filter((memberId) => !membersById.has(memberId))

      if (missingMemberIds.length > 0) {
        const { data: membersMainRows, error: membersMainError } = await dataClient
          .from("members_main")
          .select('id, Name, Picture, Department, "TBC Email"')
          .in("id", missingMemberIds)

        if (membersMainError) {
          return NextResponse.json(
            { error: membersMainError.message || "Could not load member details for NFT requests." },
            { status: 500 }
          )
        }

        for (const member of ((membersMainRows ?? []) as Record<string, unknown>[]).map((row) =>
          normalizeMember(row)
        )) {
          membersById.set(member.id, member)
        }
      }
    }

    return NextResponse.json({
      requests: requests.map((request) => ({
        ...request,
        member: membersById.get(request.member_id) ?? null,
      })),
    })
  } catch (error) {
    if (error instanceof NftRequestAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Could not load the admin NFT queue."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

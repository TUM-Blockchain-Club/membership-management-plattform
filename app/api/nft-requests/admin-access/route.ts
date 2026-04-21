import { NextResponse } from "next/server"
import { NftRequestAdminError, requireNftRequestAdmin } from "@/lib/server/nftRequestAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    await requireNftRequestAdmin(supabase, request)

    return NextResponse.json({ canManage: true })
  } catch (error) {
    if (error instanceof NftRequestAdminError) {
      if (error.status === 401 || error.status === 403) {
        return NextResponse.json({ canManage: false })
      }

      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Could not determine NFT admin access."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

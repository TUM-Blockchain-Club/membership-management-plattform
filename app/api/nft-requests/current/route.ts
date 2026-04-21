import { NextResponse } from "next/server"
import { NFT_REQUEST_IMAGE_BUCKET } from "@/lib/nftRequestConstants"
import {
  NftRequestCurrentMemberError,
  resolveCurrentNftRequestMember,
} from "@/lib/server/nftRequestCurrentMember"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type CurrentRequestRow = {
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

type SavePayload = {
  display_name?: string
  fun_facts?: string | null
  wallet_address?: string | null
  image_path?: string
  image_url?: string
}

const REQUEST_COLUMNS =
  "id, member_id, status, display_name, fun_facts, wallet_address, image_path, image_url, created_at, reviewed_at, reviewed_by, review_note, mint_tx_hash"

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { member, dataClient } = await resolveCurrentNftRequestMember(supabase, request)

    const { data, error } = await dataClient
      .from("nft_requests")
      .select(REQUEST_COLUMNS)
      .eq("member_id", member.ID)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: error.message || "Could not load the current NFT request." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      memberId: member.ID,
      member: {
        id: member.ID,
        name: member.Name,
        email: member["TBC Email"],
        department: member.Department,
      },
      request: (data as CurrentRequestRow | null) ?? null,
    })
  } catch (error) {
    if (error instanceof NftRequestCurrentMemberError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Could not load the current NFT request."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SavePayload
    const supabase = await createSupabaseServerClient()
    const { member, dataClient } = await resolveCurrentNftRequestMember(supabase, request)

    const displayName = payload.display_name?.trim()
    const funFacts = payload.fun_facts?.trim() || null
    const walletAddress = payload.wallet_address?.trim() || null
    const imagePath = payload.image_path?.trim()
    const imageUrl = payload.image_url?.trim()

    if (!displayName) {
      return NextResponse.json({ error: "Display name is required." }, { status: 400 })
    }

    if (!imagePath || !imageUrl) {
      return NextResponse.json({ error: "Image upload is required." }, { status: 400 })
    }

    const expectedImagePrefix = `${member.ID}/`
    if (!imagePath.startsWith(expectedImagePrefix)) {
      return NextResponse.json(
        { error: "Uploaded image path does not belong to the current user." },
        { status: 403 }
      )
    }

    if (funFacts && funFacts.length > 50) {
      return NextResponse.json({ error: "Fun facts must be 50 characters or fewer." }, { status: 400 })
    }

    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: "Wallet address must be a valid 42-character 0x address." }, { status: 400 })
    }

    const { data, error } = await dataClient
      .from("nft_requests")
      .upsert(
        {
          member_id: member.ID,
          status: "pending",
          display_name: displayName,
          fun_facts: funFacts,
          wallet_address: walletAddress,
          image_path: imagePath,
          image_url: imageUrl,
          reviewed_at: null,
          reviewed_by: null,
          review_note: null,
        },
        {
          onConflict: "member_id",
        }
      )
      .select(REQUEST_COLUMNS)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Could not save the NFT request." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      memberId: member.ID,
      request: data,
    })
  } catch (error) {
    if (error instanceof NftRequestCurrentMemberError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Could not save the NFT request."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { member, dataClient } = await resolveCurrentNftRequestMember(supabase, request)

    const { data: currentRequest, error: lookupError } = await dataClient
      .from("nft_requests")
      .select(REQUEST_COLUMNS)
      .eq("member_id", member.ID)
      .maybeSingle()

    if (lookupError) {
      return NextResponse.json(
        { error: lookupError.message || "Could not load the current NFT request." },
        { status: 500 }
      )
    }

    if (!currentRequest) {
      return NextResponse.json({ error: "No NFT request exists for the current user." }, { status: 404 })
    }

    if (currentRequest.status === "approved" || currentRequest.mint_tx_hash) {
      return NextResponse.json(
        { error: "Minted or approved NFT requests cannot be deleted from this page." },
        { status: 409 }
      )
    }

    const { error: deleteError } = await dataClient
      .from("nft_requests")
      .delete()
      .eq("member_id", member.ID)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || "Could not delete the NFT request." },
        { status: 500 }
      )
    }

    let storageWarning: string | null = null
    const imagePath = typeof currentRequest.image_path === "string" ? currentRequest.image_path.trim() : ""

    if (imagePath) {
      const { error: storageError } = await dataClient.storage
        .from(NFT_REQUEST_IMAGE_BUCKET)
        .remove([imagePath])

      if (storageError) {
        storageWarning =
          storageError.message || "The request was deleted, but the uploaded image could not be removed."
      }
    }

    return NextResponse.json({ storageWarning })
  } catch (error) {
    if (error instanceof NftRequestCurrentMemberError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Could not delete the NFT request."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

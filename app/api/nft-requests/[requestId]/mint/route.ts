import { NextResponse } from "next/server"
import { getRequiredContractEnv } from "@/lib/server/contractEnv"
import { loadNftCompositeRecord, NftCompositeError, uploadRenderedNftAsset } from "@/lib/server/nftComposite"
import { NftRequestAdminError, requireNftRequestAdmin } from "@/lib/server/nftRequestAdmin"
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin"
import { mintMembershipNft } from "@/lib/server/nftMinting"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{
    requestId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { requestId } = await context.params
    const supabase = await createSupabaseServerClient()
    const { user } = await requireNftRequestAdmin(supabase, request)
    const dataClient = getSupabaseAdminClient() ?? supabase
    const record = await loadNftCompositeRecord(dataClient, requestId)
    const nftRequest = record.request

    if (nftRequest.mint_tx_hash) {
      return NextResponse.json({ error: "This request has already been minted." }, { status: 409 })
    }

    const recipientWallet = nftRequest.wallet_address?.trim() || getRequiredContractEnv("DEPLOYER_WALLET_PUBLIC_KEY")
    const renderedAsset = await uploadRenderedNftAsset(dataClient, record)

    const mintResult = await mintMembershipNft({
      recipientWallet,
      displayName: nftRequest.display_name,
      department: record.member?.Department ?? "",
      imageUri: renderedAsset.imageUrl,
      funFacts: nftRequest.fun_facts ?? "",
    })

    const { data: updatedRequest, error: updateError } = await dataClient
      .from("nft_requests")
      .update({
        status: "approved",
        image_path: renderedAsset.imagePath,
        image_url: renderedAsset.imageUrl,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
        review_note: null,
        mint_tx_hash: mintResult.hash,
      })
      .eq("id", requestId)
      .select("id, member_id, status, display_name, fun_facts, wallet_address, image_path, image_url, created_at, reviewed_at, reviewed_by, review_note, mint_tx_hash")
      .single()

    if (updateError) {
      return NextResponse.json(
        {
          error: `Minted on-chain (${mintResult.hash}) but failed to save the request update: ${updateError.message}`,
          mintTxHash: mintResult.hash,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      request: updatedRequest,
      mintTxHash: mintResult.hash,
    })
  } catch (error) {
    if (error instanceof NftRequestAdminError || error instanceof NftCompositeError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Minting failed."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

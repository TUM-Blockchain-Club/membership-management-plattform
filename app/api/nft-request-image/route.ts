import { NextRequest, NextResponse } from "next/server"
import { NFT_REQUEST_IMAGE_BUCKET } from "@/lib/nftRequestConstants"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const imagePath = request.nextUrl.searchParams.get("path")?.trim()

  if (!imagePath) {
    return new NextResponse("Missing image path.", { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.storage
    .from(NFT_REQUEST_IMAGE_BUCKET)
    .download(imagePath)

  if (error || !data) {
    return new NextResponse("Image not found.", { status: 404 })
  }

  const arrayBuffer = await data.arrayBuffer()

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Length": String(data.size),
      "Content-Type": data.type || "application/octet-stream",
    },
  })
}

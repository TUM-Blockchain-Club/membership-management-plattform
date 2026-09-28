import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { NFT_REQUEST_IMAGE_BUCKET } from '@/lib/nftRequestConstants'
import {
  NftRequestCurrentMemberError,
  resolveCurrentNftRequestMember,
} from '@/lib/server/nftRequestCurrentMember'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

const detectImage = (bytes: Uint8Array) => {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { type: 'image/jpeg', extension: 'jpg' }
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { type: 'image/png', extension: 'png' }
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return { type: 'image/webp', extension: 'webp' }
  }
  return null
}

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get('id')?.trim()
  if (!requestId) return new NextResponse('Missing request id.', { status: 400 })

  const supabase = await createSupabaseServerClient()
  const { data: row, error: rowError } = await supabase
    .from('nft_requests')
    .select('image_path, request_image_bucket')
    .eq('id', requestId)
    .maybeSingle()
  if (rowError || !row) return new NextResponse('Image not found.', { status: 404 })

  const storageClient = getSupabaseAdminClient() ?? supabase
  const { data, error } = await storageClient.storage
    .from(row.request_image_bucket || NFT_REQUEST_IMAGE_BUCKET)
    .download(row.image_path)
  if (error || !data) return new NextResponse('Image not found.', { status: 404 })

  return new NextResponse(await data.arrayBuffer(), {
    status: 200,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Length': String(data.size),
      'Content-Type': data.type || 'application/octet-stream',
    },
  })
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { member, dataClient } = await resolveCurrentNftRequestMember(supabase, request)
    const formData = await request.formData()
    const file = formData.get('file')
    const submittedMemberId = Number(formData.get('memberId'))
    if (!(file instanceof File) || submittedMemberId !== member.ID) {
      return NextResponse.json({ error: 'Invalid image upload.' }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'NFT images must be 10 MB or smaller.' }, { status: 400 })
    }
    const detected = detectImage(bytes)
    if (!detected || detected.type !== file.type) {
      return NextResponse.json({ error: 'Upload a valid JPEG, PNG, or WebP image.' }, { status: 400 })
    }

    const prefix = `${member.ID}`
    const imagePath = `${prefix}/${randomUUID()}.${detected.extension}`
    const { error } = await dataClient.storage
      .from(NFT_REQUEST_IMAGE_BUCKET)
      .upload(imagePath, bytes, { contentType: detected.type, cacheControl: '3600' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      imagePath,
      imageUrl: `private:${NFT_REQUEST_IMAGE_BUCKET}/${imagePath}`,
    })
  } catch (error) {
    if (error instanceof NftRequestCurrentMemberError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Could not upload the NFT image.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

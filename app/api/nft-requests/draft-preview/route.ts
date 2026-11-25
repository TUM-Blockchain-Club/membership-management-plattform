import { NextResponse } from 'next/server'
import { getMembershipAssetState } from '@/lib/nftLifecycle'
import sharp from 'sharp'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NftRequestCurrentMemberError, resolveCurrentNftRequestMember } from '@/lib/server/nftRequestCurrentMember'
import { renderMembershipDraft } from '@/lib/server/membershipNftAssets'

export async function POST(request: Request) {
  try {
    const client = await createSupabaseServerClient()
    const { member, dataClient } = await resolveCurrentNftRequestMember(client, request)
    if (Number(request.headers.get('content-length')) > 4_000_000) return new NextResponse('Choose an image smaller than 3 MB.', { status: 413 })
    const form = await request.formData()
    const file = form.get('picture')
    const name = form.get('displayName')
    const flex = form.get('funFacts')
    if (!(file instanceof File) || file.size > 3_000_000 || file.size === 0) return new NextResponse('Choose an image smaller than 3 MB.', { status: 400 })
    if (typeof name !== 'string' || !name.trim() || name.length > 80 || typeof flex !== 'string' || flex.length > 50) return new NextResponse('Enter a display name and a Member Flex of up to 50 characters.', { status: 400 })
    let portrait: Buffer
    try {
      const bytes = Buffer.from(await file.arrayBuffer())
      const metadata = await sharp(bytes, { limitInputPixels: 25_000_000 }).metadata()
      if (!['jpeg', 'png', 'webp', 'avif', 'heif'].includes(metadata.format ?? '')) throw new Error('Unsupported image')
      portrait = bytes // Shared renderer handles EXIF orientation and cropping exactly as for minting.
    } catch { return new NextResponse('Choose a valid PNG, JPEG or WebP portrait (up to 25 megapixels).', { status: 400 }) }
    const { data: profile, error: profileError } = await dataClient.from('members_main').select('Status').eq('id', member.ID).single()
    if (profileError) throw profileError
    const assetState = getMembershipAssetState(profile?.Status)
    if (assetState === 'revoked') return new NextResponse('Your membership status cannot receive an NFT.', { status: 409 })
    // Render only in memory. Nothing is uploaded, published or recorded as a request.
    const image = await renderMembershipDraft({ name: name.trim(), flex, department: member.Department, batch: member.Batch, image: portrait, assetState })
    return new NextResponse(new Uint8Array(image), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) {
    if (error instanceof NftRequestCurrentMemberError) return new NextResponse(error.message, { status: error.status })
    return new NextResponse('Could not render your preview. Please try again.', { status: 500 })
  }
}

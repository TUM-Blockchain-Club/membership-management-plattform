import 'server-only'

import { buildMembershipMetadata } from '@/lib/nftLifecycle'
import { NFT_PUBLIC_ASSET_BUCKET } from '@/lib/nftRequestConstants'
import { buildNftImage } from '@/lib/server/buildNftImage'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export type MembershipNftRecord = {
  request: {
    id: string
    member_id: number
    status: 'pending' | 'approved' | 'rejected'
    display_name: string
    fun_facts: string | null
    image_path: string
    image_url: string
    request_image_bucket: string
    metadata_version: number
    asset_address: string | null
    asset_state: 'unminted' | 'active' | 'alumni' | 'burned'
    claim_wallet_address: string | null
    source_images: Array<{ bucket: string; path: string }>
  }
  member: {
    name: string | null
    department: string | null
    batch: string | null
    status: string | null
    degreeAtUni: string | null
  }
}

const REQUEST_COLUMNS =
  'id, member_id, status, display_name, fun_facts, image_path, image_url, request_image_bucket, approved_display_name, approved_fun_facts, approved_image_path, approved_image_bucket, metadata_version, asset_address, asset_state, claim_wallet_address'

export const loadMembershipNftRecord = async (
  supabase: SupabaseServerClient,
  requestId: string,
  profile: 'submitted' | 'approved' = 'submitted'
): Promise<MembershipNftRecord> => {
  const { data: request, error: requestError } = await supabase
    .from('nft_requests')
    .select(REQUEST_COLUMNS)
    .eq('id', requestId)
    .maybeSingle()

  if (requestError || !request) {
    throw new Error(requestError?.message || 'NFT request not found.')
  }

  const { data: member, error: memberError } = await supabase
    .from('members_main')
    .select('id, Name, Department, Batch, Status, degree_at_uni')
    .eq('id', request.member_id)
    .maybeSingle()

  if (memberError || !member) {
    throw new Error(memberError?.message || 'Member not found.')
  }

  const requestBucket = String(request.request_image_bucket)
  const approvedBucket = typeof request.approved_image_bucket === 'string' ? request.approved_image_bucket : null
  const approvedPath = typeof request.approved_image_path === 'string' ? request.approved_image_path : null
  const sourceImages = [
    { bucket: requestBucket, path: String(request.image_path) },
    ...(approvedBucket && approvedPath ? [{ bucket: approvedBucket, path: approvedPath }] : []),
  ].filter((item, index, items) => items.findIndex((other) => other.bucket === item.bucket && other.path === item.path) === index)
  const effectiveRequest = {
    ...request,
    display_name: profile === 'approved' && request.approved_display_name
      ? String(request.approved_display_name)
      : String(request.display_name),
    fun_facts: profile === 'approved'
      ? (request.approved_fun_facts as string | null) ?? null
      : (request.fun_facts as string | null) ?? null,
    image_path: profile === 'approved' && approvedPath ? approvedPath : String(request.image_path),
    request_image_bucket: profile === 'approved' && approvedBucket ? approvedBucket : requestBucket,
    source_images: sourceImages,
  }

  return {
    request: effectiveRequest as MembershipNftRecord['request'],
    member: {
      name: typeof member.Name === 'string' ? member.Name : null,
      department: typeof member.Department === 'string' ? member.Department : null,
      batch: member.Batch == null ? null : String(member.Batch),
      status: typeof member.Status === 'string' ? member.Status : null,
      degreeAtUni: typeof member.degree_at_uni === 'string' ? member.degree_at_uni : null,
    },
  }
}

export const renderAndUploadMembershipAssets = async (
  supabase: SupabaseServerClient,
  record: MembershipNftRecord,
  assetState: 'active' | 'alumni'
) => {
  const image = await renderMembershipImage(supabase, record, assetState)
  const version = record.request.metadata_version + 1
  const basePath = `members/${record.request.member_id}/${record.request.id}`
  const imagePath = `${basePath}/v${version}.png`
  const metadataPath = `${basePath}/v${version}.json`
  const alumniYear = assetState === 'alumni' ? new Date().getUTCFullYear() : null

  const { error: imageError } = await supabase.storage
    .from(NFT_PUBLIC_ASSET_BUCKET)
    .upload(imagePath, image, {
      cacheControl: '3600',
      contentType: 'image/png',
      upsert: true,
    })
  if (imageError) throw new Error(imageError.message)

  const { data: imagePublicData } = supabase.storage
    .from(NFT_PUBLIC_ASSET_BUCKET)
    .getPublicUrl(imagePath)
  const metadata = buildMembershipMetadata({
    name: record.request.display_name,
    imageUrl: imagePublicData.publicUrl,
    department: record.member.department || 'TUM Blockchain Club',
    funFact: record.request.fun_facts,
    batch: record.member.batch,
    assetState,
    alumniYear,
  })
  const { error: metadataError } = await supabase.storage
    .from(NFT_PUBLIC_ASSET_BUCKET)
    .upload(metadataPath, Buffer.from(JSON.stringify(metadata)), {
      cacheControl: '3600',
      contentType: 'application/json',
      upsert: true,
    })
  if (metadataError) throw new Error(metadataError.message)

  const { data: metadataPublicData } = supabase.storage
    .from(NFT_PUBLIC_ASSET_BUCKET)
    .getPublicUrl(metadataPath)

  return {
    imagePath,
    imageUrl: imagePublicData.publicUrl,
    metadataPath,
    metadataUrl: metadataPublicData.publicUrl,
    metadataVersion: version,
  }
}

export const renderMembershipImage = async (
  supabase: SupabaseServerClient,
  record: MembershipNftRecord,
  assetState: 'active' | 'alumni'
) => {
  const { data: sourceImage, error: sourceError } = await supabase.storage
    .from(record.request.request_image_bucket)
    .download(record.request.image_path)

  if (sourceError || !sourceImage) {
    throw new Error(sourceError?.message || 'Could not load the member image.')
  }

  const alumniYear = assetState === 'alumni' ? new Date().getUTCFullYear() : null
  const membershipPeriod = record.member.batch
    ? assetState === 'alumni'
      ? `Batch ${record.member.batch} – ${alumniYear}`
      : `Batch ${record.member.batch} – Present`
    : assetState === 'alumni'
      ? `Alumni ${alumniYear}`
      : 'Active member'
  return buildNftImage({
    nickname: record.request.display_name,
    batch: record.member.batch ? `B${record.member.batch}` : 'TBC',
    degreeAtUni: record.member.department || record.member.degreeAtUni || 'TUM Blockchain Club',
    programs: record.request.fun_facts || membershipPeriod,
    department: record.member.department || 'Board',
    imageBuffer: Buffer.from(await sourceImage.arrayBuffer()),
    membershipPeriod,
    membershipStatus: assetState === 'alumni' ? 'ALUMNI' : 'ACTIVE',
  })

}

export const deleteMembershipPublicAssets = async (
  supabase: SupabaseServerClient,
  record: MembershipNftRecord
) => {
  const basePath = `members/${record.request.member_id}/${record.request.id}`
  const { data: files, error: listError } = await supabase.storage
    .from(NFT_PUBLIC_ASSET_BUCKET)
    .list(basePath, { limit: 1000 })
  if (listError) throw new Error(listError.message)

  const paths = (files ?? []).map((file) => `${basePath}/${file.name}`)
  if (paths.length === 0) return

  const { error: removeError } = await supabase.storage
    .from(NFT_PUBLIC_ASSET_BUCKET)
    .remove(paths)
  if (removeError) throw new Error(removeError.message)
}

export const deleteSupersededMembershipPublicAssets = async (
  supabase: SupabaseServerClient,
  record: MembershipNftRecord,
  keepPaths: string[]
) => {
  const basePath = `members/${record.request.member_id}/${record.request.id}`
  const { data: files, error } = await supabase.storage
    .from(NFT_PUBLIC_ASSET_BUCKET)
    .list(basePath, { limit: 1000 })
  if (error) throw new Error(error.message)
  const keep = new Set(keepPaths)
  const paths = (files ?? [])
    .map((file) => `${basePath}/${file.name}`)
    .filter((path) => !keep.has(path))
  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from(NFT_PUBLIC_ASSET_BUCKET).remove(paths)
    if (removeError) throw new Error(removeError.message)
  }
}

export const deleteMembershipSourceImages = async (
  supabase: SupabaseServerClient,
  record: MembershipNftRecord
) => {
  for (const source of record.request.source_images) {
    const { error } = await supabase.storage.from(source.bucket).remove([source.path])
    if (error) throw new Error(error.message)
  }
}

export const deleteSupersededMembershipSourceImages = async (
  supabase: SupabaseServerClient,
  record: MembershipNftRecord,
  keep: { bucket: string; path: string }
) => {
  for (const source of record.request.source_images) {
    if (source.bucket === keep.bucket && source.path === keep.path) continue
    const { error } = await supabase.storage.from(source.bucket).remove([source.path])
    if (error) throw new Error(error.message)
  }
}

import { readFile } from "node:fs/promises"
import path from "node:path"
import { NFT_REQUEST_IMAGE_BUCKET } from "@/lib/nftRequestConstants"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export type NftCompositeRequestRow = {
  id: string
  member_id: number
  status: string
  display_name: string
  fun_facts: string | null
  wallet_address: string | null
  image_path: string
  image_url: string
  mint_tx_hash: string | null
}

export type NftCompositeMemberRow = {
  ID: number
  Department: string | null
}

export type NftCompositeRecord = {
  request: NftCompositeRequestRow
  member: NftCompositeMemberRow | null
}

export class NftCompositeError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "NftCompositeError"
    this.status = status
  }
}

const CANVAS_WIDTH = 1587
const CANVAS_HEIGHT = 2245
const INFO_PANEL_OFFSET_Y = 80

// These are the main tuning knobs for the final rendered NFT layout.
const PORTRAIT_FRAME = {
  x: 254,
  y: 365,
  width: 1079,
  height: 1448,
  radius: 96,
}

const INFO_PANEL = {
  x: 132,
  y: 1500 + INFO_PANEL_OFFSET_Y,
  width: 1323,
  height: 548,
  radius: 78,
}

let baseTemplatePromise: Promise<string> | null = null

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")

const wrapText = (value: string, maxCharsPerLine: number, maxLines: number) => {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return []
  }

  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word
    if (nextLine.length <= maxCharsPerLine) {
      currentLine = nextLine
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      lines.push(word.slice(0, maxCharsPerLine))
      currentLine = word.slice(maxCharsPerLine)
    }

    if (lines.length === maxLines) {
      break
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine)
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines)
  }

  const consumedWordCount = lines.join(" ").split(/\s+/).filter(Boolean).length
  if (consumedWordCount < words.length && lines.length > 0) {
    const lastLine = lines[lines.length - 1] ?? ""
    lines[lines.length - 1] =
      lastLine.length >= maxCharsPerLine - 1
        ? `${lastLine.slice(0, Math.max(0, maxCharsPerLine - 1)).trimEnd()}...`
        : `${lastLine}...`
  }

  return lines
}

const blobToDataUrl = async (blob: Blob, fallbackMimeType: string) => {
  const arrayBuffer = await blob.arrayBuffer()
  const mimeType = blob.type || fallbackMimeType
  return `data:${mimeType};base64,${Buffer.from(arrayBuffer).toString("base64")}`
}

const getBaseTemplateDataUrl = async () => {
  if (!baseTemplatePromise) {
    baseTemplatePromise = readFile(path.join(process.cwd(), "public", "nft-base-no-questionmark.png")).then(
      (file) => `data:image/png;base64,${file.toString("base64")}`
    )
  }

  return baseTemplatePromise
}

const renderTextBlock = (lines: string[], x: number, y: number, lineHeight: number) =>
  lines
    .map((line, index) => {
      const dy = index === 0 ? "0" : String(lineHeight)
      return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`
    })
    .join("")

export const getFinalNftStoragePath = (record: NftCompositeRecord) =>
  `generated/${record.request.member_id}/${record.request.id}-membership-card.svg`

export const getNftPreviewUrl = (requestId: string) => `/api/nft-requests/${requestId}/preview-image`

export const loadNftCompositeRecord = async (
  supabase: SupabaseServerClient,
  requestId: string
): Promise<NftCompositeRecord> => {
  const { data: requestRow, error: requestError } = await supabase
    .from("nft_requests")
    .select("id, member_id, status, display_name, fun_facts, wallet_address, image_path, image_url, mint_tx_hash")
    .eq("id", requestId)
    .maybeSingle()

  if (requestError) {
    throw new NftCompositeError(requestError.message || "Could not load the NFT request.", 500)
  }

  const request = requestRow as NftCompositeRequestRow | null
  if (!request) {
    throw new NftCompositeError("NFT request not found.", 404)
  }

  const { data: memberRow, error: memberError } = await supabase
    .from("Members")
    .select('"ID", "Department"')
    .eq("ID", request.member_id)
    .maybeSingle()

  if (memberError) {
    throw new NftCompositeError(memberError.message || "Could not load member details.", 500)
  }

  let rawMember = (memberRow as Record<string, unknown> | null) ?? null

  if (!rawMember) {
    const { data: membersMainRow, error: membersMainError } = await supabase
      .from("members_main")
      .select('id, Department')
      .eq("id", request.member_id)
      .maybeSingle()

    if (membersMainError) {
      throw new NftCompositeError(membersMainError.message || "Could not load member details.", 500)
    }

    rawMember = (membersMainRow as Record<string, unknown> | null) ?? null
  }

  const rawMemberId = rawMember?.ID ?? rawMember?.id
  const normalizedMemberId =
    typeof rawMemberId === "number"
      ? rawMemberId
      : typeof rawMemberId === "string"
        ? Number(rawMemberId)
        : request.member_id
  const rawDepartment = rawMember?.Department ?? rawMember?.department

  return {
    request,
    member: rawMember
      ? {
          ID: Number.isFinite(normalizedMemberId) ? normalizedMemberId : request.member_id,
          Department: typeof rawDepartment === "string" ? rawDepartment.trim() || null : null,
        }
      : null,
  }
}

export const renderNftCompositeSvg = async (supabase: SupabaseServerClient, record: NftCompositeRecord) => {
  const [baseImageDataUrl, uploadedImageBlob] = await Promise.all([
    getBaseTemplateDataUrl(),
    supabase.storage.from(NFT_REQUEST_IMAGE_BUCKET).download(record.request.image_path),
  ])

  if (uploadedImageBlob.error || !uploadedImageBlob.data) {
    throw new NftCompositeError(
      uploadedImageBlob.error?.message || "Could not load the uploaded request image from storage.",
      404
    )
  }

  const uploadedImageDataUrl = await blobToDataUrl(uploadedImageBlob.data, "image/jpeg")
  const displayNameLines = wrapText(record.request.display_name || "TBC Member", 18, 2)
  const departmentLabel = (record.member?.Department?.trim() || "TBC Member").toUpperCase()
  const departmentLines = wrapText(departmentLabel, 28, 2)
  const funFactsSource = record.request.fun_facts?.trim() || "TUM Blockchain Club Membership NFT"
  const funFactsLines = wrapText(funFactsSource, 34, 3)

  const panelLabelY = 1572 + INFO_PANEL_OFFSET_Y
  const nameStartY = 1668 + INFO_PANEL_OFFSET_Y
  const nameLineHeight = 102
  const departmentStartY = nameStartY + Math.max(displayNameLines.length, 1) * nameLineHeight + 32
  const departmentLineHeight = 48
  const funFactsStartY = departmentStartY + Math.max(departmentLines.length, 1) * departmentLineHeight + 56
  const funFactsLineHeight = 48

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" fill="none">
  <defs>
    <clipPath id="portraitClip">
      <rect x="${PORTRAIT_FRAME.x}" y="${PORTRAIT_FRAME.y}" width="${PORTRAIT_FRAME.width}" height="${PORTRAIT_FRAME.height}" rx="${PORTRAIT_FRAME.radius}" ry="${PORTRAIT_FRAME.radius}" />
    </clipPath>
    <linearGradient id="panelFill" x1="0" y1="${INFO_PANEL.y}" x2="${CANVAS_WIDTH}" y2="${INFO_PANEL.y + INFO_PANEL.height}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="rgba(5, 7, 16, 0.84)" />
      <stop offset="58%" stop-color="rgba(14, 12, 28, 0.78)" />
      <stop offset="100%" stop-color="rgba(90, 3, 141, 0.32)" />
    </linearGradient>
    <linearGradient id="panelStroke" x1="${INFO_PANEL.x}" y1="${INFO_PANEL.y}" x2="${INFO_PANEL.x + INFO_PANEL.width}" y2="${INFO_PANEL.y + INFO_PANEL.height}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="rgba(255,255,255,0.22)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.08)" />
    </linearGradient>
    <linearGradient id="photoGlow" x1="${PORTRAIT_FRAME.x}" y1="${PORTRAIT_FRAME.y}" x2="${PORTRAIT_FRAME.x}" y2="${PORTRAIT_FRAME.y + PORTRAIT_FRAME.height}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="rgba(255,255,255,0.16)" />
      <stop offset="45%" stop-color="rgba(255,255,255,0)" />
      <stop offset="100%" stop-color="rgba(90,3,141,0.22)" />
    </linearGradient>
    <linearGradient id="bottomFade" x1="0" y1="1450" x2="0" y2="2050" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="rgba(7,9,16,0)" />
      <stop offset="100%" stop-color="rgba(7,9,16,0.76)" />
    </linearGradient>
    <filter id="portraitShadow" x="0" y="0" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="28" stdDeviation="30" flood-color="rgba(0,0,0,0.46)" />
    </filter>
    <filter id="textShadow" x="0" y="0" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="rgba(0,0,0,0.4)" />
    </filter>
  </defs>

  <image href="${baseImageDataUrl}" x="0" y="0" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" preserveAspectRatio="none" />

  <g filter="url(#portraitShadow)">
    <rect x="${PORTRAIT_FRAME.x}" y="${PORTRAIT_FRAME.y}" width="${PORTRAIT_FRAME.width}" height="${PORTRAIT_FRAME.height}" rx="${PORTRAIT_FRAME.radius}" fill="#09070f" />
    <image href="${uploadedImageDataUrl}" x="${PORTRAIT_FRAME.x}" y="${PORTRAIT_FRAME.y}" width="${PORTRAIT_FRAME.width}" height="${PORTRAIT_FRAME.height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#portraitClip)" />
    <rect x="${PORTRAIT_FRAME.x}" y="${PORTRAIT_FRAME.y}" width="${PORTRAIT_FRAME.width}" height="${PORTRAIT_FRAME.height}" rx="${PORTRAIT_FRAME.radius}" fill="url(#photoGlow)" />
    <rect x="${PORTRAIT_FRAME.x}" y="${PORTRAIT_FRAME.y}" width="${PORTRAIT_FRAME.width}" height="${PORTRAIT_FRAME.height}" rx="${PORTRAIT_FRAME.radius}" stroke="rgba(255,255,255,0.14)" stroke-width="4" />
  </g>

  <rect x="${PORTRAIT_FRAME.x}" y="1460" width="${PORTRAIT_FRAME.width}" height="460" rx="${PORTRAIT_FRAME.radius}" fill="url(#bottomFade)" />

  <g filter="url(#textShadow)">
    <rect x="${INFO_PANEL.x}" y="${INFO_PANEL.y}" width="${INFO_PANEL.width}" height="${INFO_PANEL.height}" rx="${INFO_PANEL.radius}" fill="url(#panelFill)" />
    <rect x="${INFO_PANEL.x}" y="${INFO_PANEL.y}" width="${INFO_PANEL.width}" height="${INFO_PANEL.height}" rx="${INFO_PANEL.radius}" stroke="url(#panelStroke)" stroke-width="3" />

    <text x="180" y="${panelLabelY}" fill="rgba(186, 230, 253, 0.82)" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="28" font-weight="600" letter-spacing="7">MEMBERSHIP NFT</text>

    <text x="180" y="${nameStartY}" fill="#ffffff" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="94" font-weight="800">
      ${renderTextBlock(displayNameLines, 180, nameStartY, nameLineHeight)}
    </text>

    <text x="180" y="${departmentStartY}" fill="#d9a8ff" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="40" font-weight="700" letter-spacing="3">
      ${renderTextBlock(departmentLines, 180, departmentStartY, departmentLineHeight)}
    </text>

    <text x="180" y="${funFactsStartY}" fill="rgba(255,255,255,0.92)" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="40" font-weight="500">
      ${renderTextBlock(funFactsLines, 180, funFactsStartY, funFactsLineHeight)}
    </text>
  </g>
</svg>`
}

export const uploadRenderedNftAsset = async (supabase: SupabaseServerClient, record: NftCompositeRecord) => {
  const svg = await renderNftCompositeSvg(supabase, record)
  const storagePath = getFinalNftStoragePath(record)

  const { error: uploadError } = await supabase.storage.from(NFT_REQUEST_IMAGE_BUCKET).upload(storagePath, Buffer.from(svg, "utf8"), {
    contentType: "image/svg+xml",
    upsert: true,
    cacheControl: "3600",
  })

  if (uploadError) {
    throw new NftCompositeError(uploadError.message || "Could not upload the final NFT image.", 500)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(NFT_REQUEST_IMAGE_BUCKET).getPublicUrl(storagePath)

  return {
    imagePath: storagePath,
    imageUrl: publicUrl,
    svg,
  }
}

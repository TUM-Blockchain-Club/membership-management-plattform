/**
 * Documented display-name rule (lib/nftLegal.ts terms, section 2): a first name
 * with a surname initial, never a full legal name. Middle names are dropped.
 */
export const getSuggestedNftDisplayName = (fullName: string | null | undefined) => {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? []
  if (parts.length < 2) return parts[0] ?? ""

  const lastInitial = Array.from(parts.at(-1) ?? "")[0]
  return lastInitial ? `${parts[0]} ${lastInitial.toUpperCase()}.` : parts[0]
}

/** A profile update starts from the name already on the live NFT; new applications from the suggestion. */
export const getInitialNftDisplayName = (
  fullName: string | null | undefined,
  request: { display_name: string; asset_address?: string | null; asset_state?: string | null } | null
) => {
  const liveName = request?.asset_address && request.asset_state !== 'burned' ? request.display_name.trim() : ""
  return liveName || getSuggestedNftDisplayName(fullName)
}

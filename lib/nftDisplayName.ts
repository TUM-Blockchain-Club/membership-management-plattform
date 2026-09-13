export const getSuggestedNftDisplayName = (fullName: string | null | undefined) => {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? []
  if (parts.length < 2) return parts[0] ?? ""

  const lastInitial = Array.from(parts.at(-1) ?? "")[0]
  return lastInitial ? `${parts[0]} ${lastInitial.toUpperCase()}.` : parts[0]
}

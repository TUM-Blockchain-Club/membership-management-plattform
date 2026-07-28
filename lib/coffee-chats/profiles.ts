export type KnownMemberOption = {
  id: number
  name: string
  department: string | null
}

export function filterKnownMembers(
  members: KnownMemberOption[],
  query: string,
): KnownMemberOption[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return members

  return members.filter((member) =>
    `${member.name} ${member.department ?? ''}`.toLocaleLowerCase().includes(normalizedQuery),
  )
}

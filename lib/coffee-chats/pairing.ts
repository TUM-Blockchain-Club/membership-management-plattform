/**
 * Coffee Chats pairing algorithm.
 *
 * Produces matched pairs (or one trio for odd counts) from a list of signed-up
 * members, respecting exclusion lists built from cc_already_know and prior
 * round partners.
 */

export interface PairingMember {
  id: number
  interests: string[]
  alreadyKnow: number[]   // member IDs this person already knows
  priorPartners: number[] // member IDs matched in recent rounds
}

export interface PairingResult {
  person1Id: number
  person2Id: number
  person3Id?: number
}

/** Fisher-Yates in-place shuffle. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Returns true when pairing a and b should be avoided. */
function shouldExclude(a: PairingMember, b: PairingMember): boolean {
  return (
    a.alreadyKnow.includes(b.id) ||
    b.alreadyKnow.includes(a.id) ||
    a.priorPartners.includes(b.id) ||
    b.priorPartners.includes(a.id)
  )
}

/**
 * Pairs all members, avoiding excluded combos where possible.
 *
 * Strategy:
 * 1. Shuffle members to randomise who gets paired first.
 * 2. Greedily match each unpaired person with the first available partner
 *    who is not in their exclusion set.
 * 3. If no non-excluded partner exists, fall back to any remaining person.
 * 4. If the final unmatched count is 1, fold that person into the last pair
 *    to form a trio.
 */
export function runPairing(members: PairingMember[]): PairingResult[] {
  if (members.length < 2) return []

  const pool = shuffle([...members])
  const results: PairingResult[] = []

  while (pool.length > 0) {
    if (pool.length === 1) {
      if (results.length > 0) {
        results[results.length - 1].person3Id = pool[0].id
      }
      break
    }

    const compatibleCount = (member: PairingMember) =>
      pool.filter((candidate) => candidate.id !== member.id && !shouldExclude(member, candidate)).length

    pool.sort((a, b) => compatibleCount(a) - compatibleCount(b))
    const a = pool.shift()!
    const compatiblePartners = pool.filter((candidate) => !shouldExclude(a, candidate))
    const b = compatiblePartners.sort((left, right) => compatibleCount(left) - compatibleCount(right))[0] ?? pool[0]

    pool.splice(pool.findIndex((candidate) => candidate.id === b.id), 1)
    results.push({ person1Id: a.id, person2Id: b.id })
  }

  return results
}

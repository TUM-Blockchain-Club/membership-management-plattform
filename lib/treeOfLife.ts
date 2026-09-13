export type TreePerson = { id: number; name: string; department: string; picture: string | null }
export type TreeBranch = { year: number; title: string; people: Array<TreePerson & { contribution: string }> }
export type TreeData = { branches: TreeBranch[]; viewer: TreePerson }

const chapterNames = ['The next chapter', 'Built to last', 'Finding our voice', 'Growing together', 'Where it began']
const demoDepartments = ['Research', 'Marketing', 'Industry', 'IT & Development', 'Legal & Finance', 'Web3 Talents', 'External Relations']
const contributions = [
  'Turned a first idea into a gathering place for builders.',
  'Helped new members find their people and their first project.',
  'Opened the door to conversations beyond the university.',
  'Made complex ideas feel approachable through shared learning.',
  'Built the quiet foundations that helped everyone else move forward.',
  'Brought the community together around an ambitious new event.',
  'Gave the next generation the confidence to take the lead.',
]

// Deliberately synthetic assignments. Never use these as membership history.
export function createDemoBranches(people: TreePerson[], year: number): TreeBranch[] {
  return [7, 6, 5, 7, 6].map((size, batch) => ({
    year: year - batch,
    title: chapterNames[batch],
    people: people.length ? Array.from({ length: Math.min(size, people.length) }, (_, index) => ({
      ...people[(batch * 7 + index) % people.length], department: demoDepartments[index], contribution: contributions[(batch + index) % contributions.length],
    })) : [],
  }))
}

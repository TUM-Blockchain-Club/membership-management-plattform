import { test, expect } from '@playwright/test'
import { createDemoBranches } from '../lib/treeOfLife'

test('demo generations are bounded, deterministic, and do not mutate member records', () => {
  const people = Array.from({ length: 35 }, (_, index) => ({ id: index + 1, name: `Example ${index}`, department: 'Community', picture: null }))
  const branches = createDemoBranches(people, 2026)
  expect(branches.map(branch => branch.year)).toEqual([2026, 2025, 2024, 2023, 2022])
  expect(branches.map(branch => branch.people.length)).toEqual([7, 6, 5, 7, 6])
  for (const branch of branches) expect(new Set(branch.people.map(person => person.id)).size).toBe(branch.people.length)
  expect(createDemoBranches(people, 2026)).toEqual(branches)
  expect(people[0]).not.toHaveProperty('contribution')
  expect(createDemoBranches([], 2026).every(branch => branch.people.length === 0)).toBe(true)
  expect(createDemoBranches(people.slice(0, 2), 2026).every(branch => branch.people.length === 2)).toBe(true)
})

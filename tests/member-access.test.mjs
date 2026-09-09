import assert from 'node:assert/strict'
import test from 'node:test'

import { canEditDashboardMember } from '../app/dashboard/lib/memberUtils.ts'

test('board members can edit members from every department', () => {
  const boardMember = { id: 1 }
  const targetMember = { id: 2 }

  assert.equal(
    canEditDashboardMember({
      actor: boardMember,
      target: targetMember,
      hasSpecialAccess: false,
      isBoardMember: true,
    }),
    true
  )
})

test('ordinary members keep self-only editing access', () => {
  const member = { id: 1 }

  assert.equal(
    canEditDashboardMember({
      actor: member,
      target: member,
      hasSpecialAccess: false,
      isBoardMember: false,
    }),
    true
  )
  assert.equal(
    canEditDashboardMember({
      actor: member,
      target: { id: 2 },
      hasSpecialAccess: false,
      isBoardMember: false,
    }),
    false
  )
})

test('special-access users retain access to other members', () => {
  assert.equal(
    canEditDashboardMember({
      actor: { id: 1 },
      target: { id: 2 },
      hasSpecialAccess: true,
      isBoardMember: false,
    }),
    true
  )
})

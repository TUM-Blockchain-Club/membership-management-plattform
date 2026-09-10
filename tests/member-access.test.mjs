import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canEditDashboardMember,
  canEditProfileField,
} from '../app/dashboard/lib/memberUtils.ts'

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

test('members can select their own department once when it is empty', () => {
  assert.equal(
    canEditProfileField({
      fieldKey: 'Department',
      isOwnProfile: true,
      currentValue: null,
      hasSpecialAccess: false,
      isBoardMember: false,
      targetHasSpecialAccess: false,
    }),
    true
  )
  assert.equal(
    canEditProfileField({
      fieldKey: 'Department',
      isOwnProfile: true,
      currentValue: 'Research',
      hasSpecialAccess: false,
      isBoardMember: false,
      targetHasSpecialAccess: false,
    }),
    false
  )
})

test('members cannot use an empty department to edit another profile', () => {
  assert.equal(
    canEditProfileField({
      fieldKey: 'Department',
      isOwnProfile: false,
      currentValue: null,
      hasSpecialAccess: false,
      isBoardMember: false,
      targetHasSpecialAccess: false,
    }),
    false
  )
})

import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import ts from 'typescript'
import type { DashboardController } from '../app/dashboard/DashboardContext'
import { canManageNftRequests } from '../lib/member-permissions'

require.extensions['.css'] = () => {}
/* eslint-disable @typescript-eslint/no-require-imports -- Load after the stylesheet handler. */
const { DashboardContext } = require('../app/dashboard/DashboardContext')
const { default: AttendanceRoute } = require('../app/(dashboard)/attendance/page')
const { default: MembersRoute } = require('../app/(dashboard)/members/page')
const { default: EventsRoute } = require('../app/(dashboard)/events/page')
/* eslint-enable @typescript-eslint/no-require-imports */

function dashboard(role: string, forceMemberView = false): DashboardController {
  return {
    member: { id: 39, Role: role }, forceMemberView,
    effectiveHasSpecialAccess: false,
    effectiveCanManageBoardTools: role === 'Board Member' && !forceMemberView,
    membersVisibleByRole: [], filteredMembers: [], boardMembers: [], coreMembers: [],
    exCoreHonorary: [], exCoreAlumni: [], exCoreAdvisors: [], exCoreOthers: [], otherMembers: [],
    uniqueStatuses: [], uniqueDepartments: [], uniqueRoles: [], events: [],
    interestedMembers: [], participants: [], searchQuery: '', statusFilter: 'all',
    departmentFilter: 'all', roleFilter: 'all',
  } as unknown as DashboardController
}

function renderRoute(Route: React.ComponentType, state: DashboardController) {
  return renderToString(createElement(DashboardContext.Provider, { value: state }, createElement(Route)))
}

test('board members without special access can manage events', () => {
  expect(renderRoute(EventsRoute, dashboard('Board Member')).includes('Add Event')).toBe(true)
})

for (const [name, Route, control] of [
  ['attendance', AttendanceRoute, 'Manage the lecture schedule'],
  ['members', MembersRoute, 'Add Member'],
  ['events', EventsRoute, 'Add Event'],
] as const) {
  test(`${name}: normal member view hides board controls`, () => {
    expect(renderRoute(Route, dashboard('Board Member', true)).includes(control)).toBe(false)
  })
  test(`${name}: board controls remain available outside member view`, () => {
    expect(renderRoute(Route, dashboard('Board Member')).includes(control)).toBe(true)
  })
  test(`${name}: ordinary members have no board controls`, () => {
    expect(renderRoute(Route, dashboard('Core Member')).includes(control)).toBe(false)
  })
}

// Exercise the real API guards; only authenticated Supabase I/O is replaced.
function guard(path: string, member: { id: number; Role: string }, special = false, error: string | null = null, signedIn = true) {
  const client = {
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'test', email: 'board@example.invalid' } : null } }) },
    rpc: async () => ({ data: special, error: error ? { message: error } : null }),
    from: () => ({ select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: member, error: null }) }) }) }),
  }
  const loadedModule = { exports: {} as Record<string, (client: unknown) => Promise<unknown>> }
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const load = (id: string) => {
    if (id === '@/lib/server/supabaseAdmin') return { getSupabaseAdminClient: () => null }
    if (id === '@/lib/supabase/server' || id === 'server-only') return {}
    if (id === '@/lib/devBypass') return { isLocalDevBypassEnabled: () => false }
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Use Playwright's TS loader for application modules.
    return require(id.startsWith('@/') ? `../${id.slice(2)}` : id)
  }
  new Function('require', 'module', 'exports', code)(load, loadedModule, loadedModule.exports)
  return { client, exports: loadedModule.exports }
}

for (const [path, name] of [
  ['lib/server/eventAdmin.ts', 'requireEventAdmin'],
  ['lib/server/nftRequestAdmin.ts', 'requireNftRequestAdmin'],
]) {
  test(`${name}: board member without special access is allowed`, async () => {
    const f = guard(path, { id: 39, Role: 'Board Member' })
    await expect(f.exports[name](f.client)).resolves.toBeDefined()
  })
  test(`${name}: ordinary member is denied`, async () => {
    const f = guard(path, { id: 40, Role: 'Core Member' })
    await expect(f.exports[name](f.client)).rejects.toMatchObject({ status: 403 })
  })
  test(`${name}: special access is accepted`, async () => {
    const f = guard(path, { id: 40, Role: 'Core Member' }, true)
    await expect(f.exports[name](f.client)).resolves.toBeDefined()
  })
  test(`${name}: access lookup errors fail closed`, async () => {
    const f = guard(path, { id: 39, Role: 'Board Member' }, false, 'unavailable')
    await expect(f.exports[name](f.client)).rejects.toMatchObject({ status: 500 })
  })
  test(`${name}: unauthenticated requests are denied`, async () => {
    const f = guard(path, { id: 39, Role: 'Board Member' }, false, null, false)
    await expect(f.exports[name](f.client)).rejects.toMatchObject({ status: 401 })
  })
}

test('existing non-board NFT administrators retain access', async () => {
  const f = guard('lib/server/nftRequestAdmin.ts', { id: 107, Role: 'Core Member' })
  await expect(f.exports.requireNftRequestAdmin(f.client)).resolves.toBeDefined()
})

test('NFT navigation and API use the same board, special-access and legacy-admin permission', () => {
  expect(canManageNftRequests({ id: 39, Role: 'Board Member' }, false)).toBe(true)
  expect(canManageNftRequests({ id: 40, Role: 'Core Member' }, false)).toBe(false)
  expect(canManageNftRequests({ id: 40, Role: 'Core Member' }, true)).toBe(true)
  expect(canManageNftRequests({ id: 107, Role: 'Core Member' }, false)).toBe(true)
  expect(canManageNftRequests(null, false)).toBe(false)
})

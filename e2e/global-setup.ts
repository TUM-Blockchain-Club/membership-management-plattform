import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium, type FullConfig } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import { productionE2EOrigin } from './production-origin'

type StoredCookie = { name: string; value: string }

async function createAuthState(
  baseURL: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
  email: string,
  password: string,
  outputPath: string,
  accountLabel: 'member' | 'admin',
) {
  const cookies = new Map<string, StoredCookie>()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => [...cookies.values()],
      setAll: (updatedCookies) => {
        for (const cookie of updatedCookies) {
          cookies.set(cookie.name, { name: cookie.name, value: cookie.value })
        }
      },
    },
  })
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) throw new Error(`Production E2E ${accountLabel} sign-in failed: ${error.message}`)

  const browser = await chromium.launch()
  const context = await browser.newContext()
  await context.addCookies(
    [...cookies.values()].map((cookie) => ({
      ...cookie,
      url: new URL(baseURL).origin,
    })),
  )
  await context.storageState({ path: outputPath })
  await browser.close()
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL as string | undefined
  const supabaseUrl = process.env.E2E_SUPABASE_URL
  const supabaseAnonKey = process.env.E2E_SUPABASE_ANON_KEY
  const memberEmail = process.env.E2E_MEMBER_EMAIL
  const memberPassword = process.env.E2E_MEMBER_PASSWORD
  const adminEmail = process.env.E2E_ADMIN_EMAIL
  const adminPassword = process.env.E2E_ADMIN_PASSWORD

  if (!baseURL) throw new Error('Production E2E requires a base URL.')
  productionE2EOrigin(baseURL)

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !memberEmail ||
    !memberPassword ||
    !adminEmail ||
    !adminPassword
  ) {
    throw new Error('Production E2E requires the documented E2E URL, Supabase, member, and admin secrets.')
  }

  const authDirectory = path.join(process.cwd(), 'playwright/.auth')
  await mkdir(authDirectory, { recursive: true })
  await createAuthState(
    baseURL,
    supabaseUrl,
    supabaseAnonKey,
    memberEmail,
    memberPassword,
    path.join(authDirectory, 'member.json'),
    'member',
  )
  await createAuthState(
    baseURL,
    supabaseUrl,
    supabaseAnonKey,
    adminEmail,
    adminPassword,
    path.join(authDirectory, 'admin.json'),
    'admin',
  )
}

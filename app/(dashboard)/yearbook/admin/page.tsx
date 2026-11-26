import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { YearbookAdminPage } from '@/app/dashboard/tabs/yearbook/YearbookAdminPage'
import { YearbookUnavailable } from '@/app/dashboard/tabs/yearbook/YearbookUnavailable'
import type { YearbookAdminData } from '@/lib/yearbook'
import { getYearbookViewer, loadYearbookAdminData, YearbookSetupError } from '@/lib/server/yearbook'

export const metadata: Metadata = {
  title: 'Yearbook Admin – TBC Member Portal',
}

type LoadResult = { redirectTo: string } | { data: YearbookAdminData }

async function load(edition: string | undefined): Promise<LoadResult> {
  const viewer = await getYearbookViewer()
  if (!viewer) return { redirectTo: '/signin' }
  if (!viewer.canManage) return { redirectTo: '/yearbook' }
  return { data: await loadYearbookAdminData(viewer.admin, edition) }
}

export default async function Page({ searchParams }: { searchParams: Promise<{ edition?: string }> }) {
  const { edition } = await searchParams
  let result
  try {
    result = await load(edition)
  } catch (error) {
    if (error instanceof YearbookSetupError) return <YearbookUnavailable message={error.message} />
    throw error
  }
  if ('redirectTo' in result) redirect(result.redirectTo)

  return <YearbookAdminPage key={result.data.selected?.id ?? 'none'} data={result.data} />
}

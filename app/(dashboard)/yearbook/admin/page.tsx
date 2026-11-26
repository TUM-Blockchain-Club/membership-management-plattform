import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { YearbookAdminPage } from '@/app/dashboard/tabs/yearbook/YearbookAdminPage'
import { getYearbookViewer, loadYearbookAdminData } from '@/lib/server/yearbook'

export const metadata: Metadata = {
  title: 'Yearbook Admin – TBC Member Portal',
}

export default async function Page({ searchParams }: { searchParams: Promise<{ edition?: string }> }) {
  const viewer = await getYearbookViewer()
  if (!viewer) redirect('/signin')
  if (!viewer.canManage) redirect('/yearbook')

  const { edition } = await searchParams
  const data = await loadYearbookAdminData(viewer.admin, edition)
  return <YearbookAdminPage key={data.selected?.id ?? 'none'} data={data} />
}

import { redirect } from 'next/navigation'
import { AdminAccessError, requireBoardAdminAccess } from '@/lib/server/adminAccess'
import { AdminAccessPage } from '@/app/dashboard/tabs/admin-access/AdminAccessPage'

export const metadata = { title: 'Admin Access – TBC Member Portal' }
export default async function Page() {
  try { await requireBoardAdminAccess() }
  catch (error) {
    if (error instanceof AdminAccessError && error.status === 401) redirect('/signin')
    if (error instanceof AdminAccessError && error.status === 403) redirect('/home')
    throw error
  }
  return <AdminAccessPage />
}

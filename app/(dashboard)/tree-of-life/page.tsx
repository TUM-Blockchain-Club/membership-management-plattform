import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { loadTreeOfLife } from '@/lib/server/treeOfLife'
import { TreeOfLifePage } from '@/app/dashboard/tabs/tree-of-life/TreeOfLifePage'
export const metadata: Metadata = { title: 'The Tree of Life — TBC' }
export default async function Page() {
  const data = await loadTreeOfLife()
  if (!data) redirect('/signin')
  return <TreeOfLifePage initialData={data} />
}

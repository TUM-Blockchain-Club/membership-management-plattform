import 'server-only'
import { getRequestMember } from './requestMember'
import { getPictureUrl } from '@/app/dashboard/lib/memberUtils'
import { createDemoBranches, type TreeData } from '@/lib/treeOfLife'

export async function loadTreeOfLife(): Promise<TreeData | null> {
  const { member, dataClient } = await getRequestMember()
  if (!member) return null
  const { data, error } = await dataClient.from('members_main')
    .select('id, Name, Department, Picture')
    .or('Role.eq.Board Member,Role.eq.Core Member,Status.eq.Honorary')
    .order('id').limit(35)
  if (error) throw new Error('Could not load the experimental tree')
  const people = (data ?? []).map(person => ({ id: person.id, name: person.Name || 'Member', department: person.Department || 'Community', picture: getPictureUrl(person.Picture) }))
  return {
    branches: createDemoBranches(people, new Date().getUTCFullYear()),
    viewer: { id: member.id, name: member.Name || 'Member', department: member.Department || 'Community', picture: getPictureUrl(member.Picture) },
  }
}

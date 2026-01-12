import { supabase } from './supabase'
import type { Member } from './types/database.types'

export const memberService = {
  getAllMembers: async () => {
    const { data, error } = await supabase
      .from('members_main')
      .select('*')
      .order('Name', { ascending: true })
    
    return { data, error }
  },

  getMemberById: async (id: number) => {
    const { data, error } = await supabase
      .from('members_main')
      .select('*')
      .eq('id', id)
      .single()
    
    return { data, error }
  },

  getMemberByEmail: async (email: string) => {
    const { data, error } = await supabase
      .from('members_main')
      .select('*')
      .ilike('TBC Email', email)
      .maybeSingle()
    
    return { data, error }
  },

  getActiveMembers: async () => {
    const { data, error } = await supabase
      .from('members_main')
      .select('*')
      .eq('Status', 'Active')
      .order('Name', { ascending: true })
    
    return { data, error }
  },

  getMembersByDepartment: async (department: string) => {
    const { data, error } = await supabase
      .from('members_main')
      .select('*')
      .eq('Department', department)
      .eq('Status', 'Active')
      .order('Name', { ascending: true })
    
    return { data, error }
  },

  getMembersByRole: async (role: string) => {
    const { data, error } = await supabase
      .from('members_main')
      .select('*')
      .eq('Role', role)
      .order('Name', { ascending: true })
    
    return { data, error }
  },

  createMember: async (member: Partial<Member>) => {
    const { data, error } = await supabase
      .from('members_main')
      .insert(member)
      .select()
      .single()
    
    return { data, error }
  },

  updateMember: async (id: number, updates: Partial<Member>) => {
    const { data, error } = await supabase
      .from('members_main')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    return { data, error }
  },

  deleteMember: async (id: number) => {
    const { error } = await supabase
      .from('members_main')
      .delete()
      .eq('id', id)
    
    return { error }
  },

  uploadProfilePicture: async (userId: string, file: File) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/profile.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('mmp-member-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })
    
    if (error) return { data: null, error }
    
    const { data: { publicUrl } } = supabase.storage
      .from('mmp-member-photos')
      .getPublicUrl(fileName)
    
    return { data: publicUrl, error: null }
  },

  deleteProfilePicture: async (userId: string) => {
    const { data: files, error: listError } = await supabase.storage
      .from('mmp-member-photos')
      .list(userId)
    
    if (listError || !files || files.length === 0) {
      return { error: listError }
    }
    
    const filePaths = files.map(file => `${userId}/${file.name}`)
    
    const { error } = await supabase.storage
      .from('mmp-member-photos')
      .remove(filePaths)
    
    return { error }
  },

  searchMembers: async (searchTerm: string) => {
    const { data, error } = await supabase
      .from('members_main')
      .select('*')
      .or(`Name.ilike.%${searchTerm}%,"TBC Email".ilike.%${searchTerm}%`)
      .order('Name', { ascending: true })
    
    return { data, error }
  },
}

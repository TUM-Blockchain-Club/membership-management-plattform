import { supabase } from './supabase'
import type { Member } from './types/database.types'

export const memberService = {
  getAllMembers: async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('first_name', { ascending: true })
    
    return { data, error }
  },

  getMemberById: async (id: string) => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single()
    
    return { data, error }
  },

  getMemberByUserId: async (userId: string) => {
    console.log('🔍 [memberService] Querying members table for user_id:', userId)
    const query = supabase
      .from('members')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    console.log('🔍 [memberService] Query object:', query)
    
    const { data, error } = await query
    
    console.log('🔍 [memberService] Raw response data:', data)
    console.log('🔍 [memberService] Raw response error:', error)
    console.log('🔍 [memberService] Error details:', JSON.stringify(error, null, 2))
    
    return { data, error }
  },

  getActiveMembers: async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'Active')
      .order('first_name', { ascending: true })
    
    return { data, error }
  },

  getMembersByDepartment: async (department: string) => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('department', department)
      .eq('status', 'Active')
      .order('first_name', { ascending: true })
    
    return { data, error }
  },

  getMembersByRole: async (role: string) => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('role', role)
      .order('first_name', { ascending: true })
    
    return { data, error }
  },

  createMember: async (member: Partial<Member>) => {
    const { data, error } = await supabase
      .from('members')
      .insert(member)
      .select()
      .single()
    
    return { data, error }
  },

  updateMember: async (id: string, updates: Partial<Member>) => {
    const { data, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    return { data, error }
  },

  deleteMember: async (id: string) => {
    const { error } = await supabase
      .from('members')
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
      .from('members')
      .select('*')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,tbc_email.ilike.%${searchTerm}%`)
      .order('first_name', { ascending: true })
    
    return { data, error }
  },
}

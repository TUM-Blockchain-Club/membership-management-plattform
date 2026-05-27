import { NFT_REQUEST_IMAGE_BUCKET } from './nftRequestConstants'
import { supabase } from './supabase'

export type NftRequestStatus = 'pending' | 'approved' | 'rejected'

export type NftRequestUpsert = {
  member_id: number | string
  status: 'pending'
  display_name: string
  fun_facts: string | null
  wallet_address: string | null
  image_path: string
  image_url: string
  reviewed_at: null
  reviewed_by: null
  review_note: null
}

export type NftRequestRow = {
  id: string
  member_id: number | string
  status: NftRequestStatus
  display_name: string
  fun_facts: string | null
  wallet_address: string | null
  image_path: string
  image_url: string
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_note: string | null
  mint_tx_hash?: string | null
}

export type NftRequestMemberRow = {
  ID: number
  Name: string | null
  Picture: unknown | null
  Department?: string | null
  'TBC Email': string | null
}

export type AdminQueueMember = {
  id: number
  name: string | null
  email: string | null
  department: string | null
  picture: unknown | null
}

export type AdminQueueRequestRow = NftRequestRow & {
  member: AdminQueueMember | null
}

export type MintRequestResponse = {
  request: NftRequestRow
  mintTxHash: string
}

export type DeleteRequestResponse = {
  storageWarning: string | null
}

export type CurrentNftRequestResponse = {
  memberId: number
  member: {
    id: number
    name: string | null
    email: string | null
    department: string | null
  }
  request: NftRequestRow | null
}

export const nftRequestService = {
  getAdminAccess: async () => {
    const response = await fetch('/api/nft-requests/admin-access', {
      method: 'GET',
      cache: 'no-store',
    })

    const payload = (await response.json()) as
      | { canManage: boolean }
      | { error?: string }

    if (!response.ok) {
      return {
        data: false,
        error: ('error' in payload ? payload.error : undefined) || 'Could not determine NFT admin access.',
      }
    }

    return {
      data: 'canManage' in payload ? payload.canManage === true : false,
      error: null,
    }
  },

  uploadRequestImage: async (memberId: number | string, file: File) => {
    const fileExtension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? 'png' : 'png'
    const memberPrefix = String(memberId)
    const { data: existingFiles } = await supabase.storage
      .from(NFT_REQUEST_IMAGE_BUCKET)
      .list(memberPrefix, {
        limit: 100,
      })

    if (existingFiles?.length) {
      const staleFilePaths = existingFiles
        .map((entry: { name?: string | null }) => entry.name?.trim())
        .filter((name: string | undefined): name is string => Boolean(name))
        .map((name: string) => `${memberPrefix}/${name}`)

      if (staleFilePaths.length) {
        await supabase.storage
          .from(NFT_REQUEST_IMAGE_BUCKET)
          .remove(staleFilePaths)
      }
    }

    const uniqueToken =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const objectPath = `${memberPrefix}/${Date.now()}-${uniqueToken}.${fileExtension}`

    const { error } = await supabase.storage
      .from(NFT_REQUEST_IMAGE_BUCKET)
      .upload(objectPath, file, {
        cacheControl: '3600',
        contentType: file.type || undefined,
        upsert: true,
      })

    if (error) {
      return { data: null, error }
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from(NFT_REQUEST_IMAGE_BUCKET)
      .getPublicUrl(objectPath)

    return {
      data: {
        imagePath: objectPath,
        imageUrl: `${publicUrl}?t=${Date.now()}`,
      },
      error: null,
    }
  },

  getCurrentRequest: async () => {
    const response = await fetch('/api/nft-requests/current', {
      method: 'GET',
      cache: 'no-store',
    })

    const payload = (await response.json()) as
      | CurrentNftRequestResponse
      | {
          error?: string
        }

    if (!response.ok || !('memberId' in payload)) {
      return {
        data: null,
        error: ('error' in payload ? payload.error : undefined) || 'Could not load the current NFT request.',
      }
    }

    return {
      data: payload,
      error: null,
    }
  },

  saveCurrentRequest: async (
    request: Omit<NftRequestUpsert, 'member_id' | 'status' | 'reviewed_at' | 'reviewed_by' | 'review_note'>
  ) => {
    const response = await fetch('/api/nft-requests/current', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    const payload = (await response.json()) as
      | {
          memberId: number
          request: NftRequestRow
        }
      | {
          error?: string
        }

    if (!response.ok || !('request' in payload)) {
      return {
        data: null,
        error: {
          message:
            ('error' in payload ? payload.error : undefined) ||
            'Could not save the NFT request.',
        },
      }
    }

    return {
      data: payload,
      error: null,
    }
  },

  deleteCurrentRequest: async () => {
    const response = await fetch('/api/nft-requests/current', {
      method: 'DELETE',
    })

    const payload = (await response.json()) as
      | DeleteRequestResponse
      | {
          error?: string
        }

    if (!response.ok || ('error' in payload && payload.error)) {
      return {
        data: null,
        error:
          ('error' in payload ? payload.error : undefined) ||
          'Could not delete the NFT request.',
      }
    }

    return {
      data: payload as DeleteRequestResponse,
      error: null,
    }
  },

  getRequests: async () => {
    const { data, error } = await supabase
      .from('nft_requests')
      .select('id, member_id, status, display_name, fun_facts, wallet_address, image_path, image_url, created_at, reviewed_at, reviewed_by, review_note, mint_tx_hash')
      .order('created_at', { ascending: false })

    return { data: (data ?? []) as NftRequestRow[], error }
  },

  getAdminQueue: async () => {
    const response = await fetch('/api/nft-requests/admin-queue', {
      method: 'GET',
      cache: 'no-store',
    })

    const payload = (await response.json()) as
      | { requests: AdminQueueRequestRow[] }
      | { error?: string }

    if (!response.ok || !('requests' in payload)) {
      return {
        data: [] as AdminQueueRequestRow[],
        error: ('error' in payload ? payload.error : undefined) || 'Could not load the admin NFT queue.',
      }
    }

    return {
      data: payload.requests,
      error: null,
    }
  },

  reviewRequest: async (requestId: string, status: Exclude<NftRequestStatus, 'pending'>, reviewNote: string | null) => {
    const response = await fetch(`/api/nft-requests/${requestId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        reviewNote,
      }),
    })

    const payload = (await response.json()) as
      | NftRequestRow
      | {
          error?: string
        }

    if (!response.ok || !('id' in payload)) {
      return {
        data: null,
        error: {
          message:
            ('error' in payload ? payload.error : undefined) ||
            'Could not update the NFT request.',
        },
      }
    }

    return {
      data: payload,
      error: null,
    }
  },

  mintRequest: async (requestId: string) => {
    const response = await fetch(`/api/nft-requests/${requestId}/mint`, {
      method: 'POST',
    })

    const payload = (await response.json()) as
      | MintRequestResponse
      | {
          error?: string
          mintTxHash?: string
        }

    if (!response.ok || !('request' in payload)) {
      return {
        data: null,
        error: ('error' in payload ? payload.error : undefined) || 'Minting failed.',
        mintTxHash: 'mintTxHash' in payload ? payload.mintTxHash ?? null : null,
      }
    }

    return {
      data: payload,
      error: null,
      mintTxHash: payload.mintTxHash,
    }
  },

  getSignedRequestImageUrl: async (imagePath: string, fallbackUrl?: string | null) => {
    if (!imagePath?.trim()) {
      return { data: fallbackUrl ?? '', error: null }
    }

    const { data, error } = await supabase.storage
      .from(NFT_REQUEST_IMAGE_BUCKET)
      .createSignedUrl(imagePath, 60 * 60)

    if (error || !data?.signedUrl) {
      return { data: fallbackUrl ?? '', error }
    }

    return { data: data.signedUrl, error: null }
  },

  getRequestImageProxyUrl: (imagePath: string, version?: string | null) => {
    if (!imagePath?.trim()) {
      return ''
    }

    const searchParams = new URLSearchParams({ path: imagePath })
    if (version?.trim()) {
      searchParams.set('v', version)
    }
    return `/api/nft-request-image?${searchParams.toString()}`
  },

  getRequestCompositePreviewUrl: (requestId: string) => `/api/nft-requests/${requestId}/preview-image`,
}

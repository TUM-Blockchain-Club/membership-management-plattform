import { supabase } from './supabase'

export type NftRequestStatus = 'pending' | 'approved' | 'rejected'

export type NftRequestUpsert = {
  member_id: number | string
  status: 'pending'
  display_name: string
  fun_facts: string | null
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
  image_path: string
  image_url: string
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_note: string | null
  mint_tx_hash?: string | null
  update_tx_hash?: string | null
  burn_tx_hash?: string | null
  request_image_bucket?: string
  rendered_image_path?: string | null
  metadata_path?: string | null
  metadata_url?: string | null
  metadata_version?: number
  chain_network?: 'devnet' | 'mainnet-beta'
  collection_address?: string | null
  asset_address?: string | null
  owner_address?: string | null
  custody_status?: 'club' | 'member'
  asset_state?: 'unminted' | 'active' | 'alumni' | 'burned'
  claim_wallet_address?: string | null
  claim_requested_at?: string | null
  claimed_at?: string | null
  minted_at?: string | null
  updated_on_chain_at?: string | null
  burned_at?: string | null
  last_chain_error?: string | null
  reconciled_at?: string | null
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
  status: string | null
  batch: string | null
}

export type AdminQueueRequestRow = NftRequestRow & {
  member: AdminQueueMember | null
}

export type MintRequestResponse = {
  request: NftRequestRow
  transactionSignature: string
  assetAddress: string
  operation: 'mint' | 'update'
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
    const body = new FormData()
    body.set('memberId', String(memberId))
    body.set('file', file)
    const response = await fetch('/api/nft-request-image', { method: 'POST', body })
    const payload = (await response.json()) as { imagePath?: string; imageUrl?: string; error?: string }
    if (!response.ok || !payload.imagePath || !payload.imageUrl) {
      return { data: null, error: { message: payload.error || 'Could not upload the NFT image.' } }
    }
    return { data: { imagePath: payload.imagePath, imageUrl: payload.imageUrl }, error: null }
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
      .select('*')
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
          transactionSignature?: string
        }

    if (!response.ok || !('request' in payload)) {
      return {
        data: null,
        error: ('error' in payload ? payload.error : undefined) || 'Minting failed.',
        transactionSignature: 'transactionSignature' in payload ? payload.transactionSignature ?? null : null,
      }
    }

    return {
      data: payload,
      error: null,
      transactionSignature: payload.transactionSignature,
    }
  },

  getRequestImageProxyUrl: (requestId: string, version?: string | null) => {
    if (!requestId?.trim()) {
      return ''
    }

    const searchParams = new URLSearchParams({ id: requestId })
    if (version?.trim()) {
      searchParams.set('v', version)
    }
    return `/api/nft-request-image?${searchParams.toString()}`
  },

  requestClaim: async (walletAddress: string) => {
    const response = await fetch('/api/nft-requests/current/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    })
    const payload = (await response.json()) as { request?: NftRequestRow; error?: string }
    return response.ok && payload.request
      ? { data: payload.request, error: null }
      : { data: null, error: payload.error || 'Could not request the NFT transfer.' }
  },

  approveClaim: async (requestId: string) => {
    const response = await fetch(`/api/nft-requests/${requestId}/claim`, { method: 'POST' })
    const payload = (await response.json()) as { request?: NftRequestRow; error?: string }
    return response.ok && payload.request
      ? { data: payload.request, error: null }
      : { data: null, error: payload.error || 'Could not transfer the NFT.' }
  },

  updateLifecycle: async (requestId: string, action: 'sync' | 'revoke') => {
    const response = await fetch(`/api/nft-requests/${requestId}/lifecycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const payload = (await response.json()) as { request?: NftRequestRow; error?: string }
    return response.ok && payload.request
      ? { data: payload.request, error: null }
      : { data: null, error: payload.error || 'Could not update the NFT lifecycle.' }
  },

  reconcile: async () => {
    const response = await fetch('/api/nft-requests/reconcile', { method: 'POST' })
    const payload = (await response.json()) as { results?: unknown[]; error?: string }
    return response.ok
      ? { data: payload.results ?? [], error: null }
      : { data: null, error: payload.error || 'Could not reconcile Solana assets.' }
  },

  getRequestCompositePreviewUrl: (requestId: string) => `/api/nft-requests/${requestId}/preview-image`,
}

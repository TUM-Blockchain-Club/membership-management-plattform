"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  nftRequestService,
  type AdminQueueRequestRow,
  type NftRequestStatus,
} from "@/lib/nftRequests"
import type { NFTRequest } from "../NftRequestCard"

export type SortOrder = "newest" | "oldest"

const formatSubmittedAt = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))

const getInitials = (value: string) => {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase()
}

const resolvePictureUrl = (picture: unknown) => {
  if (!picture) return null

  if (typeof picture === "string") {
    if (picture.startsWith("\\x")) {
      const hexString = picture.slice(2)
      let url = ""
      for (let i = 0; i < hexString.length; i += 2) {
        url += String.fromCharCode(Number.parseInt(hexString.slice(i, i + 2), 16))
      }
      return url
    }

    return picture
  }

  if (typeof picture === "object" && picture !== null && "data" in picture) {
    const dataValue = (picture as { data?: unknown }).data
    if (!Array.isArray(dataValue)) return null

    try {
      return String.fromCharCode(...dataValue)
    } catch {
      return null
    }
  }

  return null
}

const getMemberRecord = (member: AdminQueueRequestRow["member"] | undefined | null) =>
  (member as unknown as Record<string, unknown> | undefined) ?? undefined

const getRequestMemberId = (request: AdminQueueRequestRow) => {
  const value = request.member_id
  const normalized = typeof value === "number" ? value : Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

const getMemberText = (member: AdminQueueRequestRow["member"] | undefined | null, ...keys: string[]) => {
  const record = getMemberRecord(member)
  if (!record) return null

  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed) {
        return trimmed
      }
    }
  }

  return null
}

const toUiRequest = (request: AdminQueueRequestRow, requestImage: string): NFTRequest => {
  const requestMemberId = getRequestMemberId(request)
  const memberName = getMemberText(request.member, "name", "Name") || `Member #${requestMemberId}`
  const memberEmail = getMemberText(request.member, "email", "TBC Email", "tbc_email") || "No email available"

  return {
    id: request.id,
    memberName,
    memberEmail,
    memberDepartment: getMemberText(request.member, "department", "Department"),
    degreeAtUni: getMemberText(request.member, "degree_at_uni", "Degree_at_Uni"),
    memberAvatar: resolvePictureUrl(getMemberRecord(request.member)?.picture ?? getMemberRecord(request.member)?.Picture ?? null),
    memberInitials: getInitials(memberName),
    requestImage,
    displayName: request.display_name,
    highlight: getMemberText(request.member, "highlight", "Highlight"),
    walletAddress: request.wallet_address,
    submittedAt: formatSubmittedAt(request.created_at),
    submittedAtValue: request.created_at,
    status: request.status,
    reviewNote: request.review_note,
    mintTxHash: request.mint_tx_hash ?? null,
  }
}

export function useNftApprovals() {
  const [requests, setRequests] = useState<NFTRequest[]>([])
  const [search, setSearch] = useState("")
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest")
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [mintingId, setMintingId] = useState<string | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)

  const loadRequests = useCallback(async (options?: { cancelled?: boolean; showLoading?: boolean }) => {
    const cancelled = options?.cancelled ?? false
    const showLoading = options?.showLoading ?? true

    if (showLoading) {
      setLoading(true)
    }
    setError(null)

    const { data: requestRows, error: requestsError } = await nftRequestService.getAdminQueue()
    if (cancelled) return

    if (requestsError) {
      setError(requestsError || "Could not load NFT requests.")
      setLoading(false)
      return
    }

    setRequests(
      requestRows.map((request) =>
        toUiRequest(
          request,
          nftRequestService.getRequestImageProxyUrl(request.image_path, `${request.id}:${request.created_at}`) || request.image_url
        )
      )
    )
    if (showLoading) {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      void loadRequests({ cancelled, showLoading: true })
    })

    const handleFocus = () => {
      void loadRequests({ showLoading: false })
    }

    const intervalId = window.setInterval(() => {
      void loadRequests({ showLoading: false })
    }, 15000)

    window.addEventListener("focus", handleFocus)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)
    }
  }, [loadRequests])

  const rejectingRequest = rejectingId ? requests.find((request) => request.id === rejectingId) ?? null : null
  const previewingRequest = previewingId ? requests.find((request) => request.id === previewingId) ?? null : null

  const applyStatusUpdate = useCallback(
    async (requestId: string, status: Exclude<NftRequestStatus, "pending">, reviewNote: string | null) => {
      setUpdatingId(requestId)
      setError(null)

      const { data, error: reviewError } = await nftRequestService.reviewRequest(requestId, status, reviewNote)
      if (reviewError || !data) {
        setError(reviewError?.message || "Could not update the NFT request.")
        setUpdatingId(null)
        return
      }

      setRequests((prev) =>
        prev.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: data.status,
                reviewNote: data.review_note,
              }
            : request
        )
      )
      setUpdatingId(null)
    },
    []
  )

  const handleApprove = useCallback((requestId: string) => {
    setError(null)
    setPreviewingId(requestId)
  }, [])

  const handleRejectConfirm = useCallback(
    async (reason: string) => {
      if (!rejectingId) return
      await applyStatusUpdate(rejectingId, "rejected", reason)
      setRejectingId(null)
    },
    [applyStatusUpdate, rejectingId]
  )

  const handleMint = useCallback(async (requestId: string) => {
    setMintingId(requestId)
    setError(null)

    try {
      const { data, error: mintError } = await nftRequestService.mintRequest(requestId)

      if (mintError || !data) {
        throw new Error(mintError || "Minting failed.")
      }

      setRequests((prev) =>
        prev.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: data.request.status,
                reviewNote: data.request.review_note,
                walletAddress: data.request.wallet_address,
                mintTxHash: data.mintTxHash,
                requestImage:
                  nftRequestService.getRequestImageProxyUrl(
                    data.request.image_path,
                    `${data.request.id}:${data.request.created_at}:${data.request.mint_tx_hash ?? data.mintTxHash}`
                  ) || data.request.image_url,
              }
            : request
        )
      )

      setPreviewingId(null)
    } catch (error: unknown) {
      console.error(error)
      setError(error instanceof Error ? error.message : "Could not mint the NFT.")
    } finally {
      setMintingId(null)
    }
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const result = requests.filter((request) => {
      if (!query) return true

      return [
        request.memberName,
        request.memberEmail,
        request.displayName,
        request.highlight ?? "",
        request.walletAddress ?? "",
      ].some((value) => value.toLowerCase().includes(query))
    })

    return [...result].sort((a, b) => {
      const timeA = new Date(a.submittedAtValue).getTime()
      const timeB = new Date(b.submittedAtValue).getTime()
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB
    })
  }, [requests, search, sortOrder])

  return {
    approvedCount: requests.filter((request) => request.status === "approved").length,
    error,
    filtered,
    handleApprove,
    handleMint,
    handleRejectConfirm,
    loading,
    mintingId,
    pendingCount: requests.filter((request) => request.status === "pending").length,
    previewingRequest,
    rejectedCount: requests.filter((request) => request.status === "rejected").length,
    rejectingRequest,
    search,
    setError,
    setPreviewingId,
    setRejectingId,
    setSearch,
    setSortOrder,
    sortOrder,
    updatingId,
  }
}

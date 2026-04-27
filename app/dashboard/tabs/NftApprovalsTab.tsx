"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  nftRequestService,
  type AdminQueueRequestRow,
  type NftRequestStatus,
} from "@/lib/nftRequests"
import { NFTRequestCard, type NFTRequest } from "./nft-request-card"
import { MintPreviewModal } from "./mint-preview-modal"
import { RejectModal } from "./reject-modal"
import { ArrowUpDownIcon, HexagonIcon, SearchIcon } from "./icons"

type SortOrder = "newest" | "oldest"

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

const toUiRequest = (
  request: AdminQueueRequestRow,
  requestImage: string
): NFTRequest => {
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

export function NftApprovalsTab() {
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

  const rejectingRequest = rejectingId
    ? requests.find((request) => request.id === rejectingId) ?? null
    : null
  const previewingRequest = previewingId
    ? requests.find((request) => request.id === previewingId) ?? null
    : null

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

  const handleApprove = useCallback(
    async (requestId: string) => {
      setError(null)
      setPreviewingId(requestId)
    },
    []
  )

  const handleRejectConfirm = useCallback(
    async (reason: string) => {
      if (!rejectingId) return
      await applyStatusUpdate(rejectingId, "rejected", reason)
      setRejectingId(null)
    },
    [applyStatusUpdate, rejectingId]
  )

  const handleMint = useCallback(
    async (requestId: string) => {
      setMintingId(requestId);
      setError(null);

      try {
       
        const response = await fetch('/api/mint-nft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Fehler beim Generieren des NFTs.");
        }


      setRequests((prev) =>
          prev.map((request) =>
            request.id === requestId
              ? ({
                  ...request,
                  status: 'minted',
                  reviewNote: null,
                } as unknown as typeof request)
              : request
          )
        );

        alert("NFT erfolgreich generiert und im Storage gespeichert!");
        setPreviewingId(null);

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Konnte das NFT nicht generieren.");
      } finally {
        setMintingId(null);
      }
    },
    []
  );

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
      ]
        .some((value) => value.toLowerCase().includes(query))
    })

    return [...result].sort((a, b) => {
      const timeA = new Date(a.submittedAtValue).getTime()
      const timeB = new Date(b.submittedAtValue).getTime()
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB
    })
  }, [requests, search, sortOrder])

  const pendingCount = requests.filter((request) => request.status === "pending").length
  const approvedCount = requests.filter((request) => request.status === "approved").length
  const rejectedCount = requests.filter((request) => request.status === "rejected").length

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10">
            <HexagonIcon className="h-4.5 w-4.5 text-cyan-300" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-white">NFT Minting Queue</h2>
        </div>
        <p className="ml-12 text-sm text-white/55">
          Review the submitted member NFT requests, inspect the uploaded image, and decide what gets minted next.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Pending Review", value: pendingCount, color: "text-white" },
          { label: "Approved", value: approvedCount, color: "text-emerald-300" },
          { label: "Rejected", value: rejectedCount, color: "text-rose-300" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="mb-1 text-xs uppercase tracking-[0.18em] text-white/45">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search by member, display name, email, wallet, or fun facts..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
            aria-label="Search NFT requests"
          />
        </div>

        <button
          onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/70 transition-colors hover:border-white/20 hover:text-white"
          aria-label={`Currently sorted by ${sortOrder}. Click to toggle sort order.`}
        >
          <ArrowUpDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Sort: {sortOrder === "newest" ? "Newest First" : "Oldest First"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-[36rem] animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
            <HexagonIcon className="h-6 w-6 text-white/35" aria-hidden="true" />
          </div>
          <p className="mb-1 text-base font-medium text-white">No requests found</p>
          <p className="text-sm text-white/50">
            {search ? "Try adjusting your search." : "No NFT requests have been submitted yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((request) => (
            <NFTRequestCard
              key={request.id}
              request={request}
              onApprove={handleApprove}
              onReject={setRejectingId}
              isUpdating={updatingId === request.id}
              isMinting={mintingId === request.id}
            />
          ))}
        </div>
      )}

      {rejectingRequest && (
        <RejectModal
          memberName={rejectingRequest.memberName}
          onConfirm={handleRejectConfirm}
          onCancel={() => {
            if (!updatingId) {
              setRejectingId(null)
            }
          }}
        />
      )}

      {previewingRequest && (
        <MintPreviewModal
          key={previewingRequest.id}
          request={previewingRequest}
          isMinting={mintingId === previewingRequest.id}
          error={error}
          onMint={() => void handleMint(previewingRequest.id)}
          onCancel={() => {
            if (mintingId !== previewingRequest.id) {
              setPreviewingId(null)
              setError(null)
            }
          }}
        />
      )}
    </main>
  )
}

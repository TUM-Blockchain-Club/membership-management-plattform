/* eslint-disable @next/next/no-img-element */
"use client"

import { useState } from "react"
import type { NftRequestStatus } from "@/lib/nftRequests"
import { CheckIcon, ClockIcon, XIcon } from "./icons"

export interface NFTRequest {
  id: string
  memberName: string
  memberEmail: string
  memberDepartment: string | null
  memberAvatar: string | null
  memberInitials: string
  degreeAtUni: string | null
  requestImage: string
  displayName: string
  highlight: string | null
  walletAddress: string | null
  submittedAt: string
  submittedAtValue: string
  status: NftRequestStatus
  reviewNote: string | null
  mintTxHash: string | null
}

interface NFTRequestCardProps {
  request: NFTRequest
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isUpdating?: boolean
  isMinting?: boolean
}

const STATUS_STYLES: Record<NftRequestStatus, string> = {
  pending: "bg-white/10 text-white border border-white/15",
  approved: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
  rejected: "bg-rose-500/15 text-rose-200 border border-rose-400/30",
}

const shortenHash = (value: string) => `${value.slice(0, 10)}...${value.slice(-8)}`

export function NFTRequestCard({
  request,
  onApprove,
  onReject,
  isUpdating = false,
  isMinting = false,
}: NFTRequestCardProps) {
  const isActionable = request.status === "pending"
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-xl shadow-black/20 transition-colors hover:border-cyan-400/30">
      <div className="relative aspect-[4/5] overflow-hidden bg-black">
        {!imageFailed ? (
          <img
            src={`/api/nft-requests/${request.id}/preview-image?v=${new Date().getTime()}`}
            alt={`NFT request image for ${request.displayName}`}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
/>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black px-6 text-center">
            <div>
              <p className="text-sm font-medium text-white">Image unavailable</p>
              <p className="mt-2 text-xs text-white/45">The request exists, but the storage image could not be loaded.</p>
            </div>
          </div>
        )}

        <div className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[request.status]}`}>
          {request.status === "approved" ? (
            <CheckIcon className="h-3 w-3" />
          ) : request.status === "rejected" ? (
            <XIcon className="h-3 w-3" />
          ) : (
            <ClockIcon className="h-3 w-3" />
          )}
          <span className="capitalize">{request.status}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/70">Display Name</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{request.displayName}</h3>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          {request.memberAvatar ? (
            <img
              src={`${request.memberAvatar}?v=${new Date().getTime()}`}
              alt={request.memberName}
              className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-white/80">
              {request.memberInitials}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{request.memberName}</p>
            <p className="truncate text-xs text-white/55">{request.memberEmail}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Highlight</p>
          <p className="mt-1 text-sm leading-6 text-white/80">{request.highlight || "No highlight provided."}</p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Wallet</p>
            <p className="mt-1 break-all text-sm text-white/80">
              {request.walletAddress || "Central Wallet"}
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Department</p>
            <p className="mt-1 text-sm text-white/80">{request.memberDepartment || "No department available."}</p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Degree @ Uni</p>
            <p className="mt-1 text-sm text-white/80 italic">{request.degreeAtUni || "Not specified"}</p>
          </div>

          {request.reviewNote && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Review Note</p>
              <p className="mt-1 text-sm leading-6 text-white/75">{request.reviewNote}</p>
            </div>
          )}

          {request.mintTxHash && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Mint Tx</p>
              <p className="mt-1 break-all text-sm text-emerald-200">{shortenHash(request.mintTxHash)}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-white/45">
          <ClockIcon className="h-3 w-3 shrink-0" />
          <span>Submitted {request.submittedAt}</span>
        </div>

        {isActionable ? (
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(request.id)}
              disabled={isUpdating || isMinting}
              className="flex-1 rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/60"
            >
              {isMinting ? "Minting..." : "Approve"}
            </button>
            <button
              onClick={() => onReject(request.id)}
              disabled={isUpdating || isMinting}
              className="flex-1 rounded-xl border border-rose-400/40 px-3 py-2.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:border-rose-400/20 disabled:text-rose-200/60"
            >
              Reject
            </button>
          </div>
        ) : null}
      </div>
    </article>
  )
}

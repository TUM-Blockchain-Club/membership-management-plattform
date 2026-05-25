/* eslint-disable @next/next/no-img-element */
"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { NftRequestStatus } from "@/lib/nftRequests"
import { CheckIcon, ClockIcon, XIcon } from "./Icons"

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

export function NftRequestCard({
  request,
  onApprove,
  onReject,
  isUpdating = false,
  isMinting = false,
}: NFTRequestCardProps) {
  const isActionable = request.status === "pending"
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <Card className="overflow-hidden border-white/10 bg-white/[0.03] py-0 shadow-xl shadow-black/20 transition-colors hover:border-cyan-400/30">
      <div className="relative aspect-[4/5] overflow-hidden bg-black">
        {!imageFailed ? (
          <img
            src={request.requestImage}
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

        <Badge variant="outline" className={`absolute right-3 top-3 ${STATUS_STYLES[request.status]}`}>
          {request.status === "approved" ? (
            <CheckIcon className="h-3 w-3" />
          ) : request.status === "rejected" ? (
            <XIcon className="h-3 w-3" />
          ) : (
            <ClockIcon className="h-3 w-3" />
          )}
          <span className="capitalize">{request.status}</span>
        </Badge>
      </div>

      <CardHeader>
          <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/70">Display Name</p>
          <CardTitle className="text-lg font-semibold text-white">{request.displayName}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <Avatar size="lg">
            {request.memberAvatar && (
              <AvatarImage src={`${request.memberAvatar}?v=${new Date().getTime()}`} alt={request.memberName} />
            )}
            <AvatarFallback className="border border-white/10 bg-white/5 text-xs font-semibold text-white/80">
              {request.memberInitials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{request.memberName}</p>
            <p className="truncate text-xs text-white/55">{request.memberEmail}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
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
      </CardContent>

        {isActionable ? (
          <CardFooter className="gap-2 border-white/10 bg-transparent">
            <Button
              onClick={() => onApprove(request.id)}
              disabled={isUpdating || isMinting}
              className="flex-1 bg-emerald-500 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:bg-emerald-500/60"
            >
              {isMinting ? "Minting..." : "Approve"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onReject(request.id)}
              disabled={isUpdating || isMinting}
              className="flex-1 border-rose-400/40 text-xs font-semibold text-rose-200 hover:bg-rose-500/10 disabled:border-rose-400/20 disabled:text-rose-200/60"
            >
              Reject
            </Button>
          </CardFooter>
        ) : null}
    </Card>
  )
}

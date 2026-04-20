"use client"

import Image from "next/image"
import { Check, X, Clock } from "lucide-react"

export interface NFTRequest {
  id: string
  memberName: string
  memberAvatar: string
  memberEmail: string
  nftImage: string
  nftName: string
  traits: { label: string; value: string }[]
  submittedAt: string
  status: "pending" | "approved" | "rejected"
}

interface NFTRequestCardProps {
  request: NFTRequest
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export function NFTRequestCard({ request, onApprove, onReject }: NFTRequestCardProps) {
  const isActionable = request.status === "pending"

  return (
    <article className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col hover:border-primary/40 transition-colors group">
      {/* NFT Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        <Image
          src={request.nftImage}
          alt={`NFT preview for ${request.nftName}`}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Status Badge */}
        {request.status !== "pending" && (
          <div
            className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              request.status === "approved"
                ? "bg-success/20 text-success-foreground border border-success/30"
                : "bg-destructive/20 text-destructive-foreground border border-destructive/30"
            }`}
          >
            {request.status === "approved" ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {request.status === "approved" ? "Approved" : "Rejected"}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col gap-4 flex-1">
        {/* NFT Title */}
        <h3 className="text-sm font-semibold text-foreground">{request.nftName}</h3>

        {/* Member Info */}
        <div className="flex items-center gap-2.5">
          <div className="relative h-8 w-8 rounded-full overflow-hidden border border-border shrink-0">
            <Image
              src={request.memberAvatar}
              alt={request.memberName}
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{request.memberName}</p>
            <p className="text-xs text-muted-foreground truncate">{request.memberEmail}</p>
          </div>
        </div>

        {/* Traits */}
        <div className="bg-muted/50 rounded-xl p-3 space-y-1.5">
          {request.traits.map((trait) => (
            <div key={trait.label} className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{trait.label}</span>
              <span className="text-xs font-medium text-foreground">{trait.value}</span>
            </div>
          ))}
        </div>

        {/* Submitted At */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-auto">
          <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>Submitted {request.submittedAt}</span>
        </div>

        {/* Actions */}
        {isActionable && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onApprove(request.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-success text-success-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              aria-label={`Approve NFT request from ${request.memberName}`}
            >
              <Check className="h-3.5 w-3.5" />
              Approve
            </button>
            <button
              onClick={() => onReject(request.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-destructive/50 text-destructive-foreground text-xs font-semibold hover:bg-destructive/15 transition-colors"
              aria-label={`Reject NFT request from ${request.memberName}`}
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

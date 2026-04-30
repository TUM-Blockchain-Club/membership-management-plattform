/* eslint-disable @next/next/no-img-element */
"use client"

import { useMemo, useState } from "react"
import { nftRequestService } from "@/lib/nftRequests"
import type { NFTRequest } from "./NftRequestCard"
import { HexagonIcon, XIcon } from "./Icons"

interface MintPreviewModalProps {
  request: NFTRequest
  isMinting: boolean
  error: string | null
  onMint: () => void
  onCancel: () => void
}

export function MintPreviewModal({ request, isMinting, error, onMint, onCancel }: MintPreviewModalProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const previewUrl = useMemo(
    () => `${nftRequestService.getRequestCompositePreviewUrl(request.id)}?t=${encodeURIComponent(request.submittedAtValue)}`,
    [request.id, request.submittedAtValue]
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mint-preview-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={isMinting ? undefined : onCancel}
        aria-hidden="true"
      />

      <div className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/12 bg-[#090b15] shadow-2xl shadow-black/50 lg:flex-row">
        <div className="flex-1 border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(90,3,141,0.26),_transparent_58%)] p-5 lg:border-b-0 lg:border-r lg:p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#5a038d]/15 text-[#d9a8ff]">
                <HexagonIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="mint-preview-modal-title" className="text-lg font-semibold text-white">
                  Final Mint Preview
                </h2>
                <p className="mt-1 text-sm text-white/55">
                  This is the exact layered NFT image that will be minted on-chain.
                </p>
              </div>
            </div>

            <button
              onClick={onCancel}
              disabled={isMinting}
              className="rounded-xl p-2 text-white/45 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Close mint preview"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/50 shadow-[0_20px_60px_rgba(0,0,0,0.42)]">
            {!imageFailed ? (
              <img
                src={`${previewUrl}?v=${new Date().getTime()}`}
                alt={`Final NFT preview for ${request.displayName}`}
                className="block w-full object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex aspect-[1190/1684] items-center justify-center px-8 text-center">
                <div>
                  <p className="text-base font-semibold text-white">Preview unavailable</p>
                  <p className="mt-2 text-sm text-white/50">
                    The final layered image could not be rendered. Check storage access and try again.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full max-w-xl p-5 lg:p-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/65">Display Name</p>
            <p className="mt-2 text-2xl font-semibold text-white">{request.displayName}</p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Department</p>
              <p className="mt-2 text-sm leading-6 text-white/82">
                {request.memberDepartment || "No department available."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Degree @ Uni</p>
              <p className="mt-2 text-sm leading-6 text-white/82 italic">
                {}
                {request.degreeAtUni || "Not specified"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Recipient Wallet</p>
              <p className="mt-2 break-all text-sm leading-6 text-white/82">
                {request.walletAddress || "Central Wallet"}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Member Flex</p>
  <p className="mt-2 text-sm leading-7 text-white/82">
    {request.highlight || "No highlight provided."}
  </p>
</div>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={onCancel}
              disabled={isMinting}
              className="flex-1 rounded-2xl border border-white/12 px-4 py-3 text-sm font-medium text-white/65 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={onMint}
              disabled={isMinting}
              className="flex-1 rounded-2xl bg-[#5a038d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#6e0ea5] disabled:cursor-not-allowed disabled:bg-[#5a038d]/50"
            >
              {isMinting ? "Minting..." : "Mint NFT"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

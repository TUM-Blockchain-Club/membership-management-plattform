/* eslint-disable @next/next/no-img-element */
"use client"

import { useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { nftRequestService } from "@/lib/nftRequests"
import type { NFTRequest } from "./NftRequestCard"
import { HexagonIcon } from 'lucide-react'

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
    <Dialog open onOpenChange={(open) => {
      if (!open && !isMinting) onCancel()
    }}>
      <DialogContent
        className="flex w-full max-w-5xl flex-col overflow-hidden border-white/12 bg-[#090b15] p-0 text-white shadow-2xl shadow-black/50 lg:flex-row"
        showCloseButton={!isMinting}
      >
        <div className="flex-1 border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(90,3,141,0.26),_transparent_58%)] p-5 lg:border-b-0 lg:border-r lg:p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#5a038d]/15 text-[#d9a8ff]">
                <HexagonIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-white">
                  Final Mint Preview
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-white/55">
                  This is the exact layered NFT image that will be minted on-chain.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

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
          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/65">Display Name</p>
            <p className="mt-2 text-2xl font-semibold text-white">{request.displayName}</p>
            </CardContent>
          </Card>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Card className="border-white/10 bg-white/[0.03]">
              <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Department</p>
              <p className="mt-2 text-sm leading-6 text-white/82">
                {request.memberDepartment || "No department available."}
              </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.03]">
              <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Degree @ Uni</p>
              <p className="mt-2 text-sm leading-6 text-white/82 italic">
                {request.degreeAtUni || "Not specified"}
              </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.03]">
              <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Recipient Wallet</p>
              <p className="mt-2 break-all text-sm leading-6 text-white/82">
                {request.walletAddress || "Central Wallet"}
              </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4 border-white/10 bg-white/[0.03]">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Member Flex</p>
              <p className="mt-2 text-sm leading-7 text-white/82">
                {request.highlight || "No highlight provided."}
              </p>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive" className="mt-4 border-rose-500/30 bg-rose-500/10 text-rose-200">
              <AlertDescription className="text-current">{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="mt-5 border-0 bg-transparent p-0">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isMinting}
              className="flex-1 border-white/12 text-white/65 hover:border-white/20 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={onMint}
              disabled={isMinting}
              className="flex-1 bg-[#5a038d] text-sm font-semibold text-white hover:bg-[#6e0ea5] disabled:bg-[#5a038d]/50"
            >
              {isMinting && <Spinner data-icon="inline-start" />}
              {isMinting ? "Minting..." : "Mint NFT"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

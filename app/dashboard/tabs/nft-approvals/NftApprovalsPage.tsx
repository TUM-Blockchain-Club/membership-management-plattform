"use client"

import { NftRequestCard } from "../NftRequestCard"
import { MintPreviewModal } from "../MintPreviewModal"
import { RejectModal } from "../RejectModal"
import { ArrowUpDownIcon, HexagonIcon, RefreshCwIcon, SearchIcon } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useNftApprovals } from "./useNftApprovals"

export function NftApprovalsPage() {
  const {
    approvedCount,
    error,
    filtered,
    handleApprove,
    handleApproveClaim,
    handleMint,
    handleRevoke,
    handleSyncLifecycle,
    handleRejectConfirm,
    handleReconcile,
    loading,
    lifecycleUpdatingId,
    mintingId,
    pendingCount,
    previewingRequest,
    rejectedCount,
    reconciling,
    rejectingRequest,
    search,
    setError,
    setPreviewingId,
    setRejectingId,
    setSearch,
    setSortOrder,
    sortOrder,
    updatingId,
  } = useNftApprovals()

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
          <Card key={stat.label} className="border-white/10 bg-white/[0.03] py-0">
            <CardContent className="px-5 py-4">
            <p className="mb-1 text-xs uppercase tracking-[0.18em] text-white/45">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search by member, display name, email, wallet, or fun facts..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 rounded-xl border-white/10 bg-white/[0.03] pl-10 text-white placeholder:text-white/35 focus-visible:border-cyan-400/40 focus-visible:ring-cyan-400/20"
            aria-label="Search NFT requests"
          />
        </div>

        <Button
          variant="outline"
          onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
          className="rounded-xl border-white/10 bg-white/[0.03] text-sm text-white/70 hover:border-white/20 hover:text-white"
          aria-label={`Currently sorted by ${sortOrder}. Click to toggle sort order.`}
        >
          <ArrowUpDownIcon data-icon="inline-start" aria-hidden="true" />
          Sort: {sortOrder === "newest" ? "Newest First" : "Oldest First"}
        </Button>
        <Button
          variant="outline"
          onClick={() => void handleReconcile()}
          disabled={reconciling}
          className="rounded-xl border-white/10 bg-white/[0.03] text-sm text-white/70 hover:border-white/20 hover:text-white"
        >
          <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
          {reconciling ? 'Checking Solana...' : 'Reconcile Solana'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6 border-rose-500/30 bg-rose-500/10 text-rose-200">
          <AlertDescription className="text-current">{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[36rem] rounded-2xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty className="rounded-2xl border border-white/10 bg-white/[0.03] py-24">
          <EmptyHeader>
            <EmptyMedia>
            <HexagonIcon className="h-6 w-6 text-white/35" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-white">No requests found</EmptyTitle>
            <EmptyDescription className="text-white/50">
            {search ? "Try adjusting your search." : "No NFT requests have been submitted yet."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((request) => (
            <NftRequestCard
              key={request.id}
              request={request}
              onApprove={handleApprove}
              onApproveClaim={handleApproveClaim}
              onReject={setRejectingId}
              onRevoke={handleRevoke}
              onSyncLifecycle={handleSyncLifecycle}
              isUpdating={updatingId === request.id}
              isMinting={mintingId === request.id}
              isLifecycleUpdating={lifecycleUpdatingId === request.id}
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

"use client"

import { NftRequestCard } from "../NftRequestCard"
import { MintPreviewModal } from "../MintPreviewModal"
import { RejectModal } from "../RejectModal"
import { ArrowUpDownIcon, HexagonIcon, SearchIcon } from "../Icons"
import { useNftApprovals } from "./useNftApprovals"

export function NftApprovalsPage() {
  const {
    approvedCount,
    error,
    filtered,
    handleApprove,
    handleMint,
    handleRejectConfirm,
    loading,
    mintingId,
    pendingCount,
    previewingRequest,
    rejectedCount,
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
            <NftRequestCard
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

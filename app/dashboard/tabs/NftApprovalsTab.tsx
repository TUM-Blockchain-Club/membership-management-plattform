"use client"

import { useState, useMemo } from "react"
import { Search, ArrowUpDown, Hexagon } from "lucide-react"
import { NFTRequestCard, type NFTRequest } from "./nft-request-card"
import { RejectModal } from "./reject-modal"

const MEMBER_AVATAR = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-zBHP5NHStlZuAhgJgM8Qs0lIaKCW6h.png"

const INITIAL_REQUESTS: NFTRequest[] = [
  {
    id: "2",
    memberName: "Lukas Bauer",
    memberAvatar: MEMBER_AVATAR,
    memberEmail: "lukas.bauer@tum-blockchain.com",
    nftImage: "/nft-2.jpg",
    nftName: "Galaxy Bot #117",
    traits: [
      { label: "Background", value: "Galaxy" },
      { label: "Eyes", value: "Laser" },
      { label: "Attribute", value: "Gold Chain" },
    ],
    submittedAt: "Apr 13, 2026 · 14:22",
    status: "pending",
  },
  {
    id: "3",
    memberName: "Sofia Müller",
    memberAvatar: MEMBER_AVATAR,
    memberEmail: "sofia.mueller@tum-blockchain.com",
    nftImage: "/nft-3.jpg",
    nftName: "Forest Mage #008",
    traits: [
      { label: "Background", value: "Forest Green" },
      { label: "Eyes", value: "Sleepy" },
      { label: "Attribute", value: "Wizard Hat" },
    ],
    submittedAt: "Apr 12, 2026 · 18:05",
    status: "pending",
  },
  {
    id: "4",
    memberName: "Marco Rossi",
    memberAvatar: MEMBER_AVATAR,
    memberEmail: "marco.rossi@tum-blockchain.com",
    nftImage: "/nft-4.jpg",
    nftName: "Sunset Pirate #331",
    traits: [
      { label: "Background", value: "Orange Sunset" },
      { label: "Eyes", value: "Winking" },
      { label: "Attribute", value: "Pirate Hat" },
    ],
    submittedAt: "Apr 11, 2026 · 11:30",
    status: "pending",
  },
  {
    id: "5",
    memberName: "Yuki Tanaka",
    memberAvatar: MEMBER_AVATAR,
    memberEmail: "yuki.tanaka@tum-blockchain.com",
    nftImage: "/nft-5.jpg",
    nftName: "Fire Lord #219",
    traits: [
      { label: "Background", value: "Red Fire" },
      { label: "Eyes", value: "Angry" },
      { label: "Attribute", value: "Crown" },
    ],
    submittedAt: "Apr 10, 2026 · 07:15",
    status: "pending",
  },
  {
    id: "6",
    memberName: "Emma Schmidt",
    memberAvatar: MEMBER_AVATAR,
    memberEmail: "emma.schmidt@tum-blockchain.com",
    nftImage: "/nft-6.jpg",
    nftName: "Cloud Bunny #505",
    traits: [
      { label: "Background", value: "Pink Sky" },
      { label: "Eyes", value: "Stars" },
      { label: "Attribute", value: "Bunny Ears" },
    ],
    submittedAt: "Apr 9, 2026 · 16:48",
    status: "pending",
  },
]

type SortOrder = "newest" | "oldest"

export function NftApprovalsTab() {
  const [requests, setRequests] = useState<NFTRequest[]>(INITIAL_REQUESTS)
  const [search, setSearch] = useState("")
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest")
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const rejectingRequest = rejectingId
    ? requests.find((r) => r.id === rejectingId)
    : null

  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
    )
  }

  const handleRejectConfirm = (reason: string) => {
    console.log("[v0] Rejection reason for", rejectingId, ":", reason)
    setRequests((prev) =>
      prev.map((r) => (r.id === rejectingId ? { ...r, status: "rejected" } : r))
    )
    setRejectingId(null)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const result = requests.filter(
      (r) =>
        r.memberName.toLowerCase().includes(q) ||
        r.nftName.toLowerCase().includes(q) ||
        r.memberEmail.toLowerCase().includes(q)
    )
    return [...result].sort((a, b) => {
      const dateA = new Date(a.submittedAt).getTime()
      const dateB = new Date(b.submittedAt).getTime()
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB
    })
  }, [requests, search, sortOrder])

  const pendingCount = requests.filter((r) => r.status === "pending").length
  const approvedCount = requests.filter((r) => r.status === "approved").length
  const rejectedCount = requests.filter((r) => r.status === "rejected").length

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
            <Hexagon className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">NFT Minting Queue</h2>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Review and approve member NFT submissions before on-chain minting.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Pending Review", value: pendingCount, color: "text-foreground" },
          { label: "Approved", value: approvedCount, color: "text-success-foreground" },
          { label: "Rejected", value: rejectedCount, color: "text-destructive-foreground" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl px-5 py-4"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search by member name, NFT name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            aria-label="Search NFT requests"
          />
        </div>
        <button
          onClick={() =>
            setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))
          }
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors whitespace-nowrap"
          aria-label={`Currently sorted by ${sortOrder}. Click to toggle sort order.`}
        >
          <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
          Sort: {sortOrder === "newest" ? "Newest First" : "Oldest First"}
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
            <Hexagon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-base font-medium text-foreground mb-1">No requests found</p>
          <p className="text-sm text-muted-foreground">
            {search ? "Try adjusting your search." : "All submissions have been reviewed."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((request) => (
            <NFTRequestCard
              key={request.id}
              request={request}
              onApprove={handleApprove}
              onReject={setRejectingId}
            />
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingRequest && (
        <RejectModal
          memberName={rejectingRequest.memberName}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectingId(null)}
        />
      )}
    </main>
  )
}

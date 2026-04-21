"use client"

import { useState } from "react"
import { AlertTriangleIcon, XIcon } from "./icons"

interface RejectModalProps {
  memberName: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export function RejectModal({ memberName, onConfirm, onCancel }: RejectModalProps) {
  const [reason, setReason] = useState("")

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim())
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15">
              <AlertTriangleIcon className="h-4.5 w-4.5 text-destructive-foreground" aria-hidden="true" />
            </div>
            <div>
              <h2 id="reject-modal-title" className="text-base font-semibold text-foreground">
                Reject NFT Request
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rejecting submission from{" "}
                <span className="text-foreground font-medium">{memberName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close modal"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-6">
          <label
            htmlFor="reject-reason"
            className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2"
          >
            Reason for Rejection
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide a clear reason so the member can understand and resubmit..."
            rows={4}
            className="w-full bg-input border border-border rounded-xl px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            This message will be sent to the member.
          </p>

          <div className="flex gap-3 mt-5">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!reason.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

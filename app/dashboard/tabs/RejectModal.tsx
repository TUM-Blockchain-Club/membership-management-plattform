"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { TriangleAlertIcon as AlertTriangleIcon } from 'lucide-react'

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
    <Dialog open onOpenChange={(open) => {
      if (!open) onCancel()
    }}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15">
              <AlertTriangleIcon className="h-4.5 w-4.5 text-destructive-foreground" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle>
                Reject NFT Request
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                Rejecting submission from{" "}
                <span className="text-foreground font-medium">{memberName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="reject-reason" className="text-xs uppercase tracking-wider text-muted-foreground">
            Reason for Rejection
          </FieldLabel>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide a clear reason so the member can understand and resubmit..."
            rows={4}
            className="resize-none bg-input text-foreground"
          />
          <FieldDescription>
            This message will be sent to the member.
          </FieldDescription>
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className="flex-1"
          >
            Confirm Rejection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

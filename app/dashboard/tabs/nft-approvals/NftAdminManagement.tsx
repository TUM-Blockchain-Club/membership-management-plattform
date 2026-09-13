"use client"

import { useState } from "react"
import useSWR from "swr"
import { ShieldIcon, UserMinusIcon, UserPlusIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

type AssignedAdmin = {
  memberId: number
  name: string
  department: string | null
  email: string | null
}

type AvailableMember = {
  id: number
  name: string
  department: string | null
}

type AdminResponse = {
  admins: AssignedAdmin[]
  availableMembers: AvailableMember[]
  canManageAdmins: boolean
  error?: string
}

const loadNftAdmins = async () => {
  const response = await fetch("/api/nft-requests/admins", { cache: "no-store" })
  const payload = (await response.json()) as AdminResponse
  if (!response.ok) throw new Error(payload.error || "Could not load NFT administrators.")
  return payload
}

export function NftAdminManagement() {
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [saving, setSaving] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const { data, error: loadError, isLoading, mutate } = useSWR("nft-admins", loadNftAdmins)

  const updateAdmin = async (method: "POST" | "DELETE", memberId: number) => {
    setSaving(true)
    setMutationError(null)
    try {
      const response = await fetch("/api/nft-requests/admins", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(payload.error || "Could not update NFT administrators.")

      setSelectedMemberId("")
      await mutate()
    } catch (updateError) {
      setMutationError(updateError instanceof Error ? updateError.message : "Could not update NFT administrators.")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return null
  if (!data) {
    return (
      <Alert variant="destructive" className="mt-8">
        <AlertDescription>
          {loadError instanceof Error ? loadError.message : "Could not load NFT administrators."}
        </AlertDescription>
      </Alert>
    )
  }
  if (!data.canManageAdmins) return null

  const error = mutationError ?? (loadError instanceof Error ? loadError.message : null)

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldIcon aria-hidden="true" />
          <CardTitle>NFT Administrators</CardTitle>
        </div>
        <CardDescription>
          Board members have access automatically. Assign additional active members to review requests and manage the
          NFT lifecycle.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Field>
          <FieldLabel htmlFor="nft-admin-member">Additional administrator</FieldLabel>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger id="nft-admin-member" className="w-full">
                <SelectValue placeholder="Choose an active member…" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {data.availableMembers.map((member) => (
                    <SelectItem key={member.id} value={String(member.id)}>
                      {member.name}
                      {member.department ? ` · ${member.department}` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              disabled={saving || !selectedMemberId}
              onClick={() => void updateAdmin("POST", Number(selectedMemberId))}
              className="w-full sm:w-auto"
            >
              {saving ? <Spinner data-icon="inline-start" /> : <UserPlusIcon data-icon="inline-start" aria-hidden="true" />}
              Assign admin
            </Button>
          </div>
          <FieldDescription>Assigned members can mint, claim, reconcile, update, and burn NFTs.</FieldDescription>
        </Field>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Additional administrators ({data.admins.length})</p>
          {data.admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No additional administrators are assigned.</p>
          ) : (
            <div className="divide-y overflow-hidden rounded-lg border">
              {data.admins.map((admin) => (
                <div key={admin.memberId} className="flex items-center justify-between gap-4 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{admin.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[admin.department, admin.email].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => void updateAdmin("DELETE", admin.memberId)}
                  >
                    <UserMinusIcon data-icon="inline-start" aria-hidden="true" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

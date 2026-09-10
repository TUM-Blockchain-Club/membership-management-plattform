"use client"

import { useMemo, useState, type FormEvent } from "react"
import useSWR from "swr"
import type { DashboardMember } from "@/app/components/dashboard/types"
import { getSolanaExplorerUrl } from "@/lib/nftLifecycle"
import { nftRequestService, type CurrentNftRequestResponse, type NftRequestRow } from "@/lib/nftRequests"

export const getLabel = (value: string | null | undefined, fallback: string) => {
  const trimmed = value?.trim()
  return trimmed || fallback
}

export const formatSubmittedAt = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))

const getRequestStatusCopy = (request: NftRequestRow | null, loadingExistingRequest: boolean) => {
  if (loadingExistingRequest) {
    return {
      label: "Checking status",
      text: "Looking up whether you already have an NFT request on file.",
      badgeClass: "border-white/10 bg-white/5 text-white/80",
    }
  }

  if (request?.asset_address && request.asset_state !== 'burned') {
    return {
      label: request.asset_state === 'alumni' ? "TBC Alumni" : "Active member",
      text: "Your Solana membership NFT is live. Profile updates remain subject to board approval.",
      badgeClass: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
    }
  }

  switch (request?.status) {
    case "pending":
      return {
        label: "Pending review",
        text: "Your request is in the admin queue. You can review the details below while the team processes it.",
        badgeClass: "border-amber-400/30 bg-amber-500/10 text-amber-200",
      }
    case "approved":
      return {
        label: "Approved",
        text: "Your NFT request has been approved. The saved request details are shown below.",
        badgeClass: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
      }
    case "rejected":
      return {
        label: "Changes requested",
        text: "Your NFT request was reviewed and needs changes. The last submitted details are shown below.",
        badgeClass: "border-rose-400/30 bg-rose-500/10 text-rose-200",
      }
    default:
      return {
        label: "Not minted",
        text: "Fill out the form below to apply for your NFT!",
        badgeClass: "border-white/10 bg-white/5 text-white/80",
      }
  }
}

const loadCurrentNftRequest = async (): Promise<CurrentNftRequestResponse> => {
  const { data, error } = await nftRequestService.getCurrentRequest()

  if (error || !data) {
    throw new Error(error || "Could not load your NFT request status.")
  }

  return data
}

export function useNftStatus(member: DashboardMember | null) {
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [batch, setBatch] = useState("")
  const [hasConsented, setHasConsented] = useState(false)
  const [displayNameManuallyEdited, setDisplayNameManuallyEdited] = useState(false)
  const [funFacts, setFunFacts] = useState("")
  const [claimWalletAddress, setClaimWalletAddress] = useState("")
  const [claiming, setClaiming] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmationRequestId, setDeleteConfirmationRequestId] = useState<string | null>(null)
  const [submissionMessage, setSubmissionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [requestLookupError, setRequestLookupError] = useState<string | null>(null)
  const [existingRequest, setExistingRequest] = useState<NftRequestRow | null>(null)
  const [currentMemberProfile, setCurrentMemberProfile] = useState<{
    id: number
    name: string | null
    email: string | null
    department: string | null
  } | null>(null)
  const [resolvedMemberId, setResolvedMemberId] = useState<number | null>(null)
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)
  const { isLoading, mutate: revalidateExistingRequest } = useSWR(
    "nft-current-request",
    loadCurrentNftRequest,
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
      onSuccess(data) {
        setRequestLookupError(null)
        setCurrentMemberProfile(data.member)
        setResolvedMemberId(data.memberId)
        setExistingRequest(data.request)
        if (!displayNameManuallyEdited && data.member.name?.trim()) {
          setDisplayName(data.member.name.trim())
        }
      },
      onError(error: unknown) {
        setCurrentMemberProfile(null)
        setResolvedMemberId(null)
        setExistingRequest(null)
        setRequestLookupError(error instanceof Error ? error.message : "Could not load your NFT request status.")
      },
    }
  )

  const selectedFileName = selectedFile?.name ?? null
  const currentMemberName = currentMemberProfile?.name?.trim() || member?.Name?.trim() || null
  const loadingExistingRequest = isLoading && !existingRequest && !requestLookupError
  const statusCopy = getRequestStatusCopy(existingRequest, loadingExistingRequest)
  const hasMintedNft = Boolean(existingRequest?.asset_address && existingRequest.asset_state !== 'burned')
  const canDeleteExistingRequest =
    Boolean(existingRequest) && !existingRequest?.asset_address
  const mintTxUrl = existingRequest?.mint_tx_hash && existingRequest.chain_network
    ? getSolanaExplorerUrl(existingRequest.mint_tx_hash, existingRequest.chain_network, 'tx')
    : null
  const assetUrl = existingRequest?.asset_address && existingRequest.chain_network
    ? getSolanaExplorerUrl(existingRequest.asset_address, existingRequest.chain_network, 'address')
    : null
  const existingRequestImageUrl = useMemo(() => {
    if (!existingRequest) return ""
    if (existingRequest.asset_address && existingRequest.image_url.startsWith('http')) {
      return existingRequest.image_url
    }
    return (
      nftRequestService.getRequestImageProxyUrl(existingRequest.id, `${existingRequest.id}:${existingRequest.created_at}`) ||
      existingRequest.image_url
    )
  }, [existingRequest])
  const deleteConfirmationArmed = deleteConfirmationRequestId === existingRequest?.id
  const summaryImageFailed = Boolean(existingRequestImageUrl && failedImageUrl === existingRequestImageUrl)

  const handleCopyPrompt = async () => {
    const promptText = `Create a premium NFT profile avatar for a member of the TBC(tum blockchain club). Subject: a futuristic university hacker and blockchain builder wearing a purple hoodie with one symbol I attached (put the icon smalled and at the right top of the hoodie with "TBC" under the icon). Action: calm confident pose, looking forward with determination. Environment: floating holographic blockchain blocks and glowing transaction chains forming a digital halo around the character. Composition: centered avatar portrait, head and shoulders, square 1:1 format, designed for a profile picture. Lighting: cinematic neon lighting with soft purple and electric blue glow. Style: ultra-clean Web3 NFT aesthetic, sharp vector illustration, slightly cyberpunk, highly detailed, polished like a top NFT collection. Size: square 1:1 aspect ratio, 4k resolution, optimized for NFT profile pictures, sharp and high-detail rendering. Other: tight avatar crop, head and shoulders only. Replace the NFT avatar's face to mimic the person (face, hair, etc.) from the reference photo, while keeping the NFT style and everything else unchanged.`

    try {
      await navigator.clipboard.writeText(promptText)
      setCopiedPrompt(true)
      window.setTimeout(() => setCopiedPrompt(false), 2000)
    } catch {
      console.error("Failed to copy text to clipboard")
      setCopiedPrompt(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (resolvedMemberId === null) {
      setSubmissionMessage({ type: "error", text: "Could not determine your member id. Please contact support." })
      return
    }

    const trimmedDisplayName = displayName.trim()
    const trimmedFunFacts = funFacts.trim()

    if (!trimmedDisplayName) {
      setSubmissionMessage({ type: "error", text: "Please enter the display name you want on the NFT." })
      return
    }

    if (!selectedFile) {
      setSubmissionMessage({ type: "error", text: "Please choose an image before applying." })
      return
    }

    if (!selectedFile.type.startsWith("image/")) {
      setSubmissionMessage({ type: "error", text: "The selected file must be an image." })
      return
    }

    if (trimmedFunFacts.length > 50) {
      setSubmissionMessage({ type: "error", text: "Fun facts must be 50 characters or fewer." })
      return
    }

    setSaving(true)
    setSubmissionMessage(null)

    try {
      const { data: imageData, error: imageError } = await nftRequestService.uploadRequestImage(resolvedMemberId, selectedFile)
      if (imageError || !imageData) {
        throw new Error(imageError?.message || "Could not upload the NFT image.")
      }

      const { data: requestData, error: requestError } = await nftRequestService.saveCurrentRequest({
        display_name: trimmedDisplayName,
        fun_facts: trimmedFunFacts || null,
        image_path: imageData.imagePath,
        image_url: imageData.imageUrl,
      })

      if (requestError || !requestData?.request) {
        throw new Error(requestError?.message || "Could not save the NFT request.")
      }

      setResolvedMemberId(requestData.memberId)
      setExistingRequest(requestData.request)
      setSelectedFile(null)
      setSubmissionMessage({ type: "success", text: "NFT request saved successfully." })
      void revalidateExistingRequest()
    } catch (error) {
      const text = error instanceof Error ? error.message : "Something went wrong while saving your request."
      setSubmissionMessage({ type: "error", text })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRequest = async () => {
    if (!existingRequest || !canDeleteExistingRequest || deleting) {
      return
    }

    if (!deleteConfirmationArmed) {
      setDeleteConfirmationRequestId(existingRequest.id)
      return
    }

    setDeleting(true)
    setSubmissionMessage(null)

    try {
      const { data, error } = await nftRequestService.deleteCurrentRequest()
      if (error) {
        throw new Error(error)
      }

      setExistingRequest(null)
      setDisplayName(currentMemberName ?? "")
      setDisplayNameManuallyEdited(false)
      setFunFacts("")
      setClaimWalletAddress("")
      setSelectedFile(null)
      setFailedImageUrl(null)
      setDeleteConfirmationRequestId(null)
      setRequestLookupError(null)
      setSubmissionMessage({
        type: "success",
        text: data?.storageWarning ? `NFT request deleted. ${data.storageWarning}` : "NFT request deleted successfully.",
      })
      void revalidateExistingRequest()
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not delete the NFT request."
      setSubmissionMessage({ type: "error", text })
    } finally {
      setDeleting(false)
    }
  }

  const handleClaimRequest = async () => {
    const walletAddress = claimWalletAddress.trim()
    if (!walletAddress || claiming) return
    setClaiming(true)
    setSubmissionMessage(null)
    try {
      const { data, error } = await nftRequestService.requestClaim(walletAddress)
      if (error || !data) throw new Error(error || 'Could not request the NFT transfer.')
      setExistingRequest(data)
      setClaimWalletAddress('')
      setSubmissionMessage({ type: 'success', text: 'Wallet transfer requested. A board member must confirm it.' })
    } catch (error) {
      setSubmissionMessage({ type: 'error', text: error instanceof Error ? error.message : 'Could not request the NFT transfer.' })
    } finally {
      setClaiming(false)
    }
  }

  return {
    batch,
    assetUrl,
    canDeleteExistingRequest,
    claiming,
    claimWalletAddress,
    copiedPrompt,
    currentMemberName,
    deleteConfirmationArmed,
    deleting,
    displayName,
    existingRequest,
    existingRequestImageUrl,
    funFacts,
    handleCopyPrompt,
    handleClaimRequest,
    handleDeleteRequest,
    handleSubmit,
    hasConsented,
    hasMintedNft,
    loadingExistingRequest,
    mintTxUrl,
    requestLookupError,
    saving,
    selectedFileName,
    setBatch,
    setDeleteConfirmationArmed: (armed: boolean) => {
      setDeleteConfirmationRequestId(armed ? existingRequest?.id ?? null : null)
    },
    setDisplayName,
    setDisplayNameManuallyEdited,
    setFunFacts,
    setHasConsented,
    setSelectedFile,
    setSummaryImageFailed: (failed: boolean) => {
      setFailedImageUrl(failed ? existingRequestImageUrl || null : null)
    },
    setClaimWalletAddress,
    statusCopy,
    submissionMessage,
    summaryImageFailed,
  }
}

export type NftStatusController = ReturnType<typeof useNftStatus>

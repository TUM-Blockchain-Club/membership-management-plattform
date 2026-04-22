'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DashboardMember } from '@/app/components/dashboard/types'
import { nftRequestService, type NftRequestRow } from '@/lib/nftRequests'

const AI_PROMPT =
  'Create a clean, professional portrait for a membership NFT: head-and-shoulders framing, looking at the camera, friendly and confident expression, subtle futuristic web3 atmosphere, soft cinematic lighting, modern digital illustration style, polished background, premium card-ready composition, no text, no watermark.'

const getLabel = (value: string | null | undefined, fallback: string) => {
  const trimmed = value?.trim()
  return trimmed || fallback
}

const formatSubmittedAt = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

const getRequestStatusCopy = (request: NftRequestRow | null, loadingExistingRequest: boolean) => {
  if (loadingExistingRequest) {
    return {
      label: 'Checking status',
      text: 'Looking up whether you already have an NFT request on file.',
      badgeClass: 'border-white/10 bg-white/5 text-white/80',
    }
  }

  if (request?.mint_tx_hash) {
    return {
      label: 'Minted on Polygon',
      text: 'Your membership NFT is minted and the final on-chain artwork is shown below.',
      badgeClass: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
    }
  }

  switch (request?.status) {
    case 'pending':
      return {
        label: 'Pending review',
        text: 'Your request is in the admin queue. You can review the details below while the team processes it.',
        badgeClass: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
      }
    case 'approved':
      return {
        label: 'Approved',
        text: 'Your NFT request has been approved. The saved request details are shown below.',
        badgeClass: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
      }
    case 'rejected':
      return {
        label: 'Changes requested',
        text: 'Your NFT request was reviewed and needs changes. The last submitted details are shown below.',
        badgeClass: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
      }
    default:
      return {
        label: 'Not minted',
        text: 'Fill out the form below to apply for your NFT!',
        badgeClass: 'border-white/10 bg-white/5 text-white/80',
      }
  }
}

export function NftStatusTab({ member }: { member: DashboardMember | null }) {
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [useDifferentWallet, setUseDifferentWallet] = useState(false)
  const [displayName, setDisplayName] = useState(member?.Name ?? '')
  const [displayNameManuallyEdited, setDisplayNameManuallyEdited] = useState(false)
  const [funFacts, setFunFacts] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmationArmed, setDeleteConfirmationArmed] = useState(false)
  const [submissionMessage, setSubmissionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [requestLookupError, setRequestLookupError] = useState<string | null>(null)
  const [existingRequest, setExistingRequest] = useState<NftRequestRow | null>(null)
  const [currentMemberProfile, setCurrentMemberProfile] = useState<{
    id: number
    name: string | null
    email: string | null
    department: string | null
  } | null>(null)
  const [resolvedMemberId, setResolvedMemberId] = useState<number | null>(null)
  const [loadingExistingRequest, setLoadingExistingRequest] = useState(true)
  const [summaryImageFailed, setSummaryImageFailed] = useState(false)

  const selectedFileName = selectedFile?.name ?? null
  const currentMemberName = currentMemberProfile?.name?.trim() || member?.Name?.trim() || null
  const statusCopy = getRequestStatusCopy(existingRequest, loadingExistingRequest)
  const hasMintedNft = Boolean(existingRequest?.mint_tx_hash)
  const canDeleteExistingRequest =
    Boolean(existingRequest) && existingRequest?.status !== 'approved' && !existingRequest?.mint_tx_hash
  const mintTxUrl = existingRequest?.mint_tx_hash ? `https://polygonscan.com/tx/${existingRequest.mint_tx_hash}` : null
  const existingRequestImageUrl = useMemo(() => {
    if (!existingRequest) return ''
    return (
      nftRequestService.getRequestImageProxyUrl(existingRequest.image_path, `${existingRequest.id}:${existingRequest.created_at}`) ||
      existingRequest.image_url
    )
  }, [existingRequest])

  const loadExistingRequest = useCallback(async (options?: { cancelled?: boolean; showLoading?: boolean }) => {
    const cancelled = options?.cancelled ?? false
    const showLoading = options?.showLoading ?? true

    if (showLoading) {
      setLoadingExistingRequest(true)
    }
    setRequestLookupError(null)

    const { data, error } = await nftRequestService.getCurrentRequest()
    if (cancelled) return

    if (error || !data) {
      setCurrentMemberProfile(null)
      setResolvedMemberId(null)
      setExistingRequest(null)
      setRequestLookupError(error || 'Could not load your NFT request status.')
      setLoadingExistingRequest(false)
      return
    }

    setCurrentMemberProfile(data.member)
    setResolvedMemberId(data.memberId)
    setExistingRequest(data.request)
    if (showLoading) {
      setLoadingExistingRequest(false)
    }
  }, [])

  useEffect(() => {
    if (displayNameManuallyEdited || !currentMemberName) {
      return
    }

    setDisplayName(currentMemberName)
  }, [currentMemberName, displayNameManuallyEdited])

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      void loadExistingRequest({ cancelled, showLoading: true })
    })

    const handleFocus = () => {
      void loadExistingRequest({ showLoading: false })
    }

    const intervalId = window.setInterval(() => {
      void loadExistingRequest({ showLoading: false })
    }, 15000)

    window.addEventListener('focus', handleFocus)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadExistingRequest])

  useEffect(() => {
    setSummaryImageFailed(false)
  }, [existingRequestImageUrl])

  useEffect(() => {
    setDeleteConfirmationArmed(false)
  }, [existingRequest?.id])

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT)
      setCopiedPrompt(true)
      window.setTimeout(() => setCopiedPrompt(false), 2000)
    } catch {
      setCopiedPrompt(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (resolvedMemberId === null) {
      setSubmissionMessage({ type: 'error', text: 'Could not determine your member id. Please contact support.' })
      return
    }

    const trimmedDisplayName = displayName.trim()
    const trimmedFunFacts = funFacts.trim()
    const trimmedWalletAddress = walletAddress.trim()

    if (!trimmedDisplayName) {
      setSubmissionMessage({ type: 'error', text: 'Please enter the display name you want on the NFT.' })
      return
    }

    if (!selectedFile) {
      setSubmissionMessage({ type: 'error', text: 'Please choose an image before applying.' })
      return
    }

    if (!selectedFile.type.startsWith('image/')) {
      setSubmissionMessage({ type: 'error', text: 'The selected file must be an image.' })
      return
    }

    if (trimmedFunFacts.length > 50) {
      setSubmissionMessage({ type: 'error', text: 'Fun facts must be 50 characters or fewer.' })
      return
    }

    if (useDifferentWallet && !trimmedWalletAddress) {
      setSubmissionMessage({ type: 'error', text: 'Please enter the wallet address for minting.' })
      return
    }

    if (trimmedWalletAddress && !/^0x[a-fA-F0-9]{40}$/.test(trimmedWalletAddress)) {
      setSubmissionMessage({ type: 'error', text: 'Wallet address must be a valid 42-character 0x address.' })
      return
    }

    setSaving(true)
    setSubmissionMessage(null)

    try {
      const { data: imageData, error: imageError } = await nftRequestService.uploadRequestImage(resolvedMemberId, selectedFile)
      if (imageError || !imageData) {
        throw new Error(imageError?.message || 'Could not upload the NFT image.')
      }

      const { data: requestData, error: requestError } = await nftRequestService.saveCurrentRequest({
        display_name: trimmedDisplayName,
        fun_facts: trimmedFunFacts || null,
        wallet_address: useDifferentWallet ? trimmedWalletAddress : null,
        image_path: imageData.imagePath,
        image_url: imageData.imageUrl,
      })

      if (requestError || !requestData?.request) {
        throw new Error(requestError?.message || 'Could not save the NFT request.')
      }

      setResolvedMemberId(requestData.memberId)
      setExistingRequest(requestData.request)
      setSelectedFile(null)
      setSubmissionMessage({ type: 'success', text: 'NFT request saved successfully.' })
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Something went wrong while saving your request.'
      setSubmissionMessage({ type: 'error', text })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRequest = async () => {
    if (!existingRequest || !canDeleteExistingRequest || deleting) {
      return
    }

    if (!deleteConfirmationArmed) {
      setDeleteConfirmationArmed(true)
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
      setDisplayName(currentMemberName ?? '')
      setDisplayNameManuallyEdited(false)
      setFunFacts('')
      setWalletAddress('')
      setUseDifferentWallet(false)
      setSelectedFile(null)
      setSummaryImageFailed(false)
      setDeleteConfirmationArmed(false)
      setRequestLookupError(null)
      setSubmissionMessage({
        type: 'success',
        text: data?.storageWarning
          ? `NFT request deleted. ${data.storageWarning}`
          : 'NFT request deleted successfully.',
      })
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Could not delete the NFT request.'
      setSubmissionMessage({ type: 'error', text })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-emerald-500/10 p-6 sm:p-8">
      <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-emerald-400/20 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
              Membership NFT
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              {hasMintedNft
                ? `Your minted membership NFT is ready${currentMemberName ? ` for ${getLabel(currentMemberName, 'your profile')}` : ''}. You can review the final card and inspect the mint transaction below.`
                : `Use this form to request your TBC membership NFT. You can set the display name, share fun facts, and provide the image you want to appear on the card${currentMemberName ? ` for ${getLabel(currentMemberName, 'your profile')}` : ''}.`}
            </p>

            <div className="mt-6 max-w-sm rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-white/50">Status</div>
              <div className="mt-2 text-lg font-semibold text-white">{statusCopy.label}</div>
              <div className="mt-1 text-sm text-white/60">{statusCopy.text}</div>
            </div>

            {mintTxUrl && (
              <div className="mt-4">
                <a
                  href={mintTxUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-400/15"
                >
                  Check On-Chain
                </a>
              </div>
            )}
          </div>

          <div className="mx-auto w-full max-w-[280px]">
            {hasMintedNft && existingRequestImageUrl && !summaryImageFailed ? (
              <div className="nft-preview-frame rounded-[30px] bg-black/20 p-3 shadow-2xl shadow-cyan-950/30 backdrop-blur-sm">
                <div className="relative aspect-[1587/2245] overflow-hidden rounded-[22px] border border-white/10 bg-black">
                  <Image
                    src={existingRequestImageUrl}
                    alt={`Minted membership NFT for ${existingRequest?.display_name ?? 'member'}`}
                    fill
                    unoptimized
                    priority
                    sizes="280px"
                    className="object-cover"
                    onError={() => setSummaryImageFailed(true)}
                  />
                </div>
              </div>
            ) : (
              <div className="nft-preview-frame rounded-[30px] bg-black/20 p-3 shadow-2xl shadow-cyan-950/30 backdrop-blur-sm">
                <div className="nft-preview-card relative aspect-[1587/2245] overflow-hidden rounded-[22px] border border-white/10 bg-black">
                  <Image
                    src="/nft-base-no-questionmark.png"
                    alt="Membership NFT base preview"
                    fill
                    priority
                    sizes="280px"
                    className="object-cover"
                  />

                  <div className="nft-question-mark-stage" aria-hidden="true">
                    <div className="nft-question-mark-rotator">
                      <div className="nft-question-mark-face">
                        <Image
                          src="/question-mark-cutout.png"
                          alt=""
                          fill
                          sizes="160px"
                          className="nft-question-mark-image object-contain"
                        />
                      </div>
                      <div className="nft-question-mark-face nft-question-mark-face-back">
                        <Image
                          src="/question-mark-cutout.png"
                          alt=""
                          fill
                          sizes="160px"
                          className="nft-question-mark-image object-contain"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-x-5 bottom-5 rounded-[18px] border border-white/10 bg-black/45 px-4 py-3 text-center shadow-xl backdrop-blur-md">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/75">
                      {hasMintedNft ? 'Minted NFT' : 'Awaiting Mint'}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      {hasMintedNft
                        ? 'The minted NFT image could not be loaded right now.'
                        : 'Your final NFT card will appear here once it has been reviewed and minted.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
        <div>
          <h3 className="text-xl font-bold text-white">
            {existingRequest ? (hasMintedNft ? 'Your Minted Membership NFT' : 'Your NFT Request Summary') : 'NFT Application Form'}
          </h3>
          <p className="mt-1 text-sm text-white/60">
            {existingRequest
              ? hasMintedNft
                ? 'Your NFT is live. Review the minted artwork, transaction hash, and saved request details below.'
                : 'You already have a saved NFT request. Review the details below.'
              : 'Provide the details you want us to use when preparing your membership NFT.'}
          </p>
        </div>

        {requestLookupError && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {requestLookupError}
          </div>
        )}

        {submissionMessage && (
          <div
            className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
              submissionMessage.type === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}
          >
            {submissionMessage.text}
          </div>
        )}

        {loadingExistingRequest ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="aspect-[4/5] animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
              <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
            </div>
          </div>
        ) : existingRequest ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className={`self-start overflow-hidden rounded-2xl border bg-black/30 ${hasMintedNft ? 'border-cyan-400/30 shadow-lg shadow-cyan-950/20' : 'border-white/10'}`}>
              <div className={`relative bg-black ${hasMintedNft ? 'aspect-[1587/2245]' : 'aspect-[4/5]'}`}>
                {existingRequestImageUrl && !summaryImageFailed ? (
                  <Image
                    src={existingRequestImageUrl}
                    alt={`${hasMintedNft ? 'Minted NFT' : 'Submitted NFT image'} for ${existingRequest.display_name}`}
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 240px"
                    className="object-cover"
                    onError={() => setSummaryImageFailed(true)}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/55">
                    The submitted image could not be loaded.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/70">{hasMintedNft ? 'Minted NFT' : 'Saved Request'}</p>
                    <h4 className="mt-2 text-2xl font-semibold text-white">{existingRequest.display_name}</h4>
                  </div>
                  <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusCopy.badgeClass}`}>
                    {statusCopy.label}
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-white/70">{statusCopy.text}</p>

                {mintTxUrl && (
                  <div className="mt-4">
                    <a
                      href={mintTxUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-400/15"
                    >
                      Check On-Chain
                    </a>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">Submitted</div>
                  <div className="mt-2 text-sm text-white">{formatSubmittedAt(existingRequest.created_at)}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">Wallet</div>
                  <div className="mt-2 break-all text-sm text-white">
                    {existingRequest.wallet_address || 'Central Wallet'}
                  </div>
                </div>

                {existingRequest.mint_tx_hash && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:col-span-2">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/45">Mint Transaction</div>
                    <div className="mt-2 break-all text-sm text-cyan-100">{existingRequest.mint_tx_hash}</div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Fun Facts</div>
                <p className="mt-3 text-sm leading-6 text-white/80">
                  {existingRequest.fun_facts || 'No fun facts were submitted with this request.'}
                </p>
              </div>

              {existingRequest.review_note && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">Admin Note</div>
                  <p className="mt-3 text-sm leading-6 text-white/80">{existingRequest.review_note}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {canDeleteExistingRequest ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDeleteRequest}
                      disabled={deleting}
                      className={`inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${
                        deleteConfirmationArmed
                          ? 'border-rose-500/35 bg-rose-950/40 text-rose-100 hover:bg-rose-950/55 disabled:border-rose-500/20 disabled:text-rose-200/60'
                          : 'border-rose-400/40 text-rose-200 hover:bg-rose-500/10 disabled:border-rose-400/20 disabled:text-rose-200/60'
                      }`}
                    >
                      {deleting ? 'Deleting...' : deleteConfirmationArmed ? 'Confirm?' : 'Delete request'}
                    </button>

                    {deleteConfirmationArmed && !deleting && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmationArmed(false)}
                        className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:text-white"
                      >
                        Cancel
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-white/55">
                    {hasMintedNft ? 'Minted requests stay on record and can be tracked on-chain from this page.' : 'Minted requests stay on record and cannot be deleted from this page.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid items-start gap-5 md:grid-cols-2">
              <label className="flex h-full flex-col">
                <span className="text-sm font-medium text-white">Display Name</span>
                <input
                  type="text"
                  name="displayName"
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value)
                    setDisplayNameManuallyEdited(true)
                  }}
                  placeholder="Enter the name you want on the NFT"
                  disabled={saving}
                  className="mt-2 h-14 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-cyan-400/50 focus:bg-black/40"
                />
                <span aria-hidden="true" className="mt-2 min-h-[1.25rem] text-xs text-transparent">
                  Alignment spacer
                </span>
              </label>

              <div className="flex h-full flex-col">
                <span className="text-sm font-medium text-white">Upload Picture</span>
                <label
                  htmlFor="nft-picture-upload"
                  className="mt-2 flex h-14 w-full cursor-pointer items-center rounded-xl border border-dashed border-white/15 bg-black/30 px-4 text-sm text-white/80 transition hover:border-cyan-400/40 hover:bg-black/40"
                >
                  <span className="inline-flex h-9 shrink-0 items-center rounded-lg bg-cyan-500/20 px-4 font-medium text-cyan-100">
                    Choose File
                  </span>
                  <span className="ml-4 truncate text-white/65">{selectedFileName ?? 'No file chosen'}</span>
                </label>
                <input
                  id="nft-picture-upload"
                  type="file"
                  name="picture"
                  accept="image/*"
                  className="sr-only"
                  disabled={saving}
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
                <p className="mt-2 min-h-[1.25rem] text-xs text-white/45">
                  {selectedFileName ? `Selected: ${selectedFileName}` : 'PNG, JPG, or other image formats are supported.'}
                </p>
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-white">Fun Facts</span>
              <textarea
                name="funFacts"
                rows={5}
                maxLength={50}
                value={funFacts}
                onChange={(event) => setFunFacts(event.target.value)}
                placeholder="Share a few short facts, interests, or traits you want associated with your NFT."
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50 focus:bg-black/40"
              />
              <p className="mt-2 text-xs text-white/45">Limited to 50 characters.</p>
            </label>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-5">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">Image Guidance</h4>
              <p className="mt-3 text-sm leading-6 text-white/75">
                You may upload a real portrait, a stylized representation of yourself, or a tasteful AI-generated or illustrated image,
                provided it is appropriate for use on your membership NFT and suitable for a professional community setting.
              </p>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-white">Nanobanana prompt template</div>
                  <div className="text-xs text-cyan-200">{copiedPrompt ? 'Copied' : 'Click to copy'}</div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-left text-sm leading-6 text-white/80 transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
                >
                  {AI_PROMPT}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={useDifferentWallet}
                  disabled={saving}
                  onChange={(event) => {
                    const checked = event.target.checked
                    setUseDifferentWallet(checked)
                    if (!checked) {
                      setWalletAddress('')
                    }
                  }}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-black/40 text-cyan-400 focus:ring-cyan-400"
                />
                <span>
                  <span className="block text-sm font-medium text-white">Send this NFT to a different wallet</span>
                  <span className="mt-1 block text-sm text-white/60">
                    Enable this if you want to specify a separate recipient wallet for minting.
                  </span>
                </span>
              </label>

              {useDifferentWallet && (
                <label className="mt-4 block">
                  <span className="text-sm font-medium text-white">Wallet Address</span>
                  <input
                    type="text"
                    name="walletAddress"
                    value={walletAddress}
                    onChange={(event) => setWalletAddress(event.target.value)}
                    placeholder="0x..."
                    disabled={saving}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50 focus:bg-black/40"
                  />
                </label>
              )}
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/60 disabled:text-slate-900/70"
              >
                {saving ? 'Saving...' : 'Apply'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

'use client'

import Image from 'next/image'
import type {DashboardMember} from '@/app/components/dashboard/types'
import {formatSubmittedAt, getLabel, useNftStatus} from './useNftStatus'

export function NftStatusPage({member}: { member: DashboardMember | null }) {
    const {
        batch,
        canDeleteExistingRequest,
        copiedPrompt,
        currentMemberName,
        deleteConfirmationArmed,
        deleting,
        displayName,
        existingRequest,
        existingRequestImageUrl,
        funFacts,
        handleCopyPrompt,
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
        setDeleteConfirmationArmed,
        setDisplayName,
        setDisplayNameManuallyEdited,
        setFunFacts,
        setHasConsented,
        setSelectedFile,
        setSummaryImageFailed,
        setUseDifferentWallet,
        setWalletAddress,
        statusCopy,
        submissionMessage,
        summaryImageFailed,
        useDifferentWallet,
        walletAddress,
    } = useNftStatus(member)

    return (
        <div className="max-w-5xl mx-auto">
            <div
                className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-emerald-500/10 p-6 sm:p-8">
                <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl"/>
                <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-emerald-400/20 blur-3xl"/>

                <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
                    <div>
                        <div
                            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                            Membership NFT
                        </div>

                        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                            {hasMintedNft
                                ? `Your minted membership NFT is ready${currentMemberName ? ` for ${getLabel(currentMemberName, 'your profile')}` : ''}. You can review the final card and inspect the mint transaction below.`
                                : `Use this form to request your TBC membership NFT. You can set the display name, share fun facts, and provide the image you want to appear on the card${currentMemberName ? ` for ${getLabel(currentMemberName, 'your profile')}` : ''}.`}
                        </p>

                        <div
                            className="mt-6 max-w-sm rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
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
                            <div
                                className="nft-preview-frame rounded-[30px] bg-black/20 p-3 shadow-2xl shadow-cyan-950/30 backdrop-blur-sm">
                                <div
                                    className="relative aspect-[1587/2245] overflow-hidden rounded-[22px] border border-white/10 bg-black">
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
                            <div
                                className="nft-preview-frame rounded-[30px] bg-black/20 p-3 shadow-2xl shadow-cyan-950/30 backdrop-blur-sm">
                                <div
                                    className="nft-preview-card relative aspect-[1587/2245] overflow-hidden rounded-[22px] border border-white/10 bg-black">
                                    {/* --- NEW LAYERED BACKGROUND --- */}
                                    <Image
                                        src="/assets/base1.png"
                                        alt="NFT Base 1"
                                        fill
                                        priority
                                        sizes="280px"
                                        className="object-cover opacity-80"
                                    />
                                    <Image
                                        src="/assets/base2.png"
                                        alt="NFT Base 2"
                                        fill
                                        priority
                                        sizes="280px"
                                        className="object-cover"
                                    />
                                    <Image
                                        src="/assets/overlay_it&dev.png"
                                        alt="Department Overlay"
                                        fill
                                        priority
                                        sizes="280px"
                                        className="object-cover z-10"
                                    />
                                    {/* ------------------------------ */}

                                    <div className="nft-question-mark-stage z-20" aria-hidden="true">
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

                                    <div
                                        className="absolute inset-x-5 bottom-5 z-30 rounded-[18px] border border-white/10 bg-black/45 px-4 py-3 text-center shadow-xl backdrop-blur-md">
                                        <div
                                            className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/75">
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
                    <div
                        className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {requestLookupError}
                    </div>
                )}

                {submissionMessage && (
                    <div
                        className={`mt-6 rounded-xl border px-4 py-3 text-sm ${submissionMessage.type === 'success'
                            ? 'border-green-500/30 bg-green-500/10 text-green-300'
                            : 'border-red-500/30 bg-red-500/10 text-red-300'
                        }`}
                    >
                        {submissionMessage.text}
                    </div>
                )}

                {loadingExistingRequest ? (
                    <div className="mt-6 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                        <div className="aspect-[4/5] animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"/>
                        <div className="space-y-4">
                            <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"/>
                            <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"/>
                        </div>
                    </div>
                ) : existingRequest ? (
                    <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                        <div
                            className={`self-start overflow-hidden rounded-2xl border bg-black/30 ${hasMintedNft ? 'border-cyan-400/30 shadow-lg shadow-cyan-950/20' : 'border-white/10'}`}>
                            <div
                                className={`relative bg-black ${hasMintedNft ? 'aspect-[1587/2245]' : 'aspect-[4/5]'}`}>
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
                                    <div
                                        className="flex h-full items-center justify-center px-6 text-center text-sm text-white/55">
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
                                    <div
                                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusCopy.badgeClass}`}>
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
                                    <div
                                        className="mt-2 text-sm text-white">{formatSubmittedAt(existingRequest.created_at)}</div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/45">Wallet</div>
                                    <div className="mt-2 break-all text-sm text-white">
                                        {existingRequest.wallet_address || 'Central Wallet'}
                                    </div>
                                </div>

                                {existingRequest.mint_tx_hash && (
                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:col-span-2">
                                        <div className="text-xs uppercase tracking-[0.18em] text-white/45">Mint
                                            Transaction
                                        </div>
                                        <div
                                            className="mt-2 break-all text-sm text-cyan-100">{existingRequest.mint_tx_hash}</div>
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
                                            className={`inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${deleteConfirmationArmed
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
                        {/* LEFT COLUMN: Name and Batch */}
                        <div className="flex flex-col space-y-5">

                            {/* Display Name */}
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
                                    placeholder="e.g. John D."
                                    disabled={saving}
                                    autoComplete="off"
                                    className="mt-2 h-14 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-cyan-400/50 focus:bg-black/40"
                                />
                                {/* 👇 The new warning text is right here 👇 */}
                                <span className="mt-2 text-xs text-amber-400/80 flex items-center">
                  <svg className="w-3 h-3 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"/>
                  </svg>
                  For privacy, please do not use your full name.
                </span>
                            </label>

                            {/* Batch Field */}
                            <label className="flex h-full flex-col">
                                <span className="text-sm font-medium text-white">Batch</span>
                                <input
                                    type="text"
                                    name="batch"
                                    value={batch}
                                    onChange={(event) => setBatch(event.target.value)}
                                    placeholder="e.g. 8"
                                    disabled={saving}
                                    autoComplete="off"
                                    className="mt-2 h-14 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-cyan-400/50 focus:bg-black/40"
                                />
                            </label>


                            <div className="flex h-full flex-col">

                                {/* Nano Banana Generation Kit */}
                                <div className="mt-8 mb-6 p-5 bg-blue-900/10 border border-blue-800/40 rounded-xl">
                                    <h3 className="text-lg font-semibold text-blue-300 mb-2">
                                        🎨 Nano Banana Generation Kit
                                    </h3>
                                    <p className="text-sm text-gray-300 mb-4">
                                        Want your NFT to match the club&apos;s high-fashion aesthetic? Download these assets
                                        and upload them to the AI as style references!
                                    </p>

                                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                                        {/* PDF Download Button */}
                                        <a
                                            href="/assets/tbc-logo.png"
                                            download="TBC_Logo.png"
                                            className="flex flex-1 items-center justify-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg border border-gray-600 transition"
                                        >
                                            📄 Download TBC Logo (PNG)
                                        </a>

                                        {/* Style Reference Download Button */}
                                        <a
                                            href="/assets/style-reference.jpeg"
                                            download="style-reference.jpeg"
                                            className="flex flex-1 items-center justify-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg border border-gray-600 transition"
                                        >
                                            🖼️ Download Style Reference
                                        </a>
                                    </div>

                                    <div
                                        onClick={handleCopyPrompt}
                                        className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 cursor-pointer hover:bg-gray-800 transition relative group"
                                    >
                                        <p className="text-sm text-blue-200 mb-1">
                                            <strong>✨ Recommended Prompt:</strong>
                                            <span
                                                className="float-right text-xs bg-blue-600 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">
                        {copiedPrompt ? "Copied to clipboard!" : "Click to copy"}
                      </span>
                                        </p>
                                        <p className="text-xs italic text-gray-400 line-clamp-4 group-hover:line-clamp-none transition-all">
                                            &quot;Create a premium NFT profile avatar for a member of the TBC(tum blockchain
                                            club)... (Click to copy full prompt)&quot;
                                        </p>
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-white">Upload Picture</span>
                                <label
                                    htmlFor="nft-picture-upload"
                                    className="mt-2 flex h-14 w-full cursor-pointer items-center rounded-xl border border-dashed border-white/15 bg-black/30 px-4 text-sm text-white/80 transition hover:border-cyan-400/40 hover:bg-black/40"
                                >
                  <span
                      className="inline-flex h-9 shrink-0 items-center rounded-lg bg-cyan-500/20 px-4 font-medium text-cyan-100">
                    Choose File
                  </span>
                                    <span
                                        className="ml-4 truncate text-white/65">{selectedFileName ?? 'No file chosen'}</span>
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

                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">Member Flex</span>
                            <textarea
                                name="funFacts"
                                value={funFacts}
                                onChange={(event) => setFunFacts(event.target.value)}
                                maxLength={50}
                                placeholder="Share your biggest flex or achievement, e.g. 'HackaTUM winner 2025', 'Deployed my own smart contract', 'Built a Web3 game', etc."
                                disabled={saving}
                                className="mt-2 min-h-[100px] w-full resize-none rounded-xl border border-white/10 bg-black/30 p-4 text-white outline-none transition focus:border-cyan-400/50 focus:bg-black/40"
                            />
                            <span className="mt-2 text-xs text-white/40">Limited to 50 characters.</span>
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

                        {/* Blockchain Permanence Consent */}
                        {/* Blockchain & Legal Consent */}
                        <div
                            className="mt-8 mb-6 flex items-start space-x-3 bg-red-900/10 p-4 border border-red-900/30 rounded-lg">
                            <div className="flex h-6 items-center">
                                <input
                                    id="consent"
                                    type="checkbox"
                                    required
                                    checked={hasConsented}
                                    onChange={(e) => setHasConsented(e.target.checked)}
                                    className="h-5 w-5 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                />
                            </div>
                            <div className="text-sm leading-6">
                                <label htmlFor="consent" className="font-medium text-gray-200 cursor-pointer">
                                    Data Permanence & Terms of Service Agreement
                                </label>
                                <p className="text-gray-400 text-xs mt-1">
                                    I understand that a cryptographic record of this NFT will be permanently minted on
                                    the blockchain.
                                    While the club maintains the ability to delete off-chain hosted images upon request,
                                    the on-chain transaction history cannot be reversed, edited, or deleted.
                                </p>
                                <p className="text-gray-400 text-xs mt-2">
                                    By checking this box, I also agree to the TUM Blockchain Club&apos;s <a href="/terms"
                                                                                                       target="_blank"
                                                                                                       className="text-blue-400 hover:underline">Terms
                                    of Service</a> and <a href="/privacy" target="_blank"
                                                          className="text-blue-400 hover:underline">Privacy Policy</a>.
                                </p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-center">
                            <button
                                type="submit"
                                disabled={!hasConsented}
                                className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/60 disabled:text-slate-900/70"
                            >
                                {saving ? 'Saving...' : 'Submit'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

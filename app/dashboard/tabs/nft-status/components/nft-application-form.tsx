import { AlertTriangleIcon, CopyIcon, FileImageIcon } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { NftStatusController } from '../useNftStatus'
import type { NftStatusSectionsProps } from './types'

export function NftApplicationForm({ state }: NftStatusSectionsProps) {
  const {
    batch,
    copiedPrompt,
    displayName,
    funFacts,
    handleCopyPrompt,
    handleSubmit,
    hasConsented,
    saving,
    selectedFileName,
    setBatch,
    setDisplayName,
    setDisplayNameManuallyEdited,
    setFunFacts,
    setHasConsented,
    setSelectedFile,
    setUseDifferentWallet,
    setWalletAddress,
    useDifferentWallet,
    walletAddress,
  } = state

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="displayName" className="text-white">Display Name</FieldLabel>
          <Input
            id="displayName"
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
            className="h-14 border-white/10 bg-black/30 text-white focus-visible:border-cyan-400/50"
          />
          <FieldDescription className="flex items-center gap-1 text-amber-400/80">
            <AlertTriangleIcon className="size-3" aria-hidden="true" />
            For privacy, please do not use your full name.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="batch" className="text-white">Batch</FieldLabel>
          <Input
            id="batch"
            type="text"
            name="batch"
            value={batch}
            onChange={(event) => setBatch(event.target.value)}
            placeholder="e.g. 8"
            disabled={saving}
            autoComplete="off"
            className="h-14 border-white/10 bg-black/30 text-white focus-visible:border-cyan-400/50"
          />
        </Field>
      </FieldGroup>

      <NftGenerationKit copiedPrompt={copiedPrompt} handleCopyPrompt={handleCopyPrompt} />

      <Field>
        <FieldLabel htmlFor="nft-picture-upload" className="text-white">Upload Picture</FieldLabel>
        <label
          htmlFor="nft-picture-upload"
          className="flex h-14 w-full cursor-pointer items-center rounded-xl border border-dashed border-white/15 bg-black/30 px-4 text-sm text-white/80 transition hover:border-cyan-400/40 hover:bg-black/40"
        >
          <span className="inline-flex h-9 shrink-0 items-center rounded-lg bg-cyan-500/20 px-4 font-medium text-cyan-100">
            Choose File
          </span>
          <span className="ml-4 truncate text-white/65">{selectedFileName ?? 'No file chosen'}</span>
        </label>
        <Input
          id="nft-picture-upload"
          type="file"
          name="picture"
          accept="image/*"
          className="sr-only"
          disabled={saving}
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        />
        <FieldDescription className="min-h-[1.25rem] text-white/45">
          {selectedFileName ? `Selected: ${selectedFileName}` : 'PNG, JPG, or other image formats are supported.'}
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="funFacts" className="text-white">Member Flex</FieldLabel>
        <Textarea
          id="funFacts"
          name="funFacts"
          value={funFacts}
          onChange={(event) => setFunFacts(event.target.value)}
          maxLength={50}
          placeholder="Share your biggest flex or achievement, e.g. 'HackaTUM winner 2025', 'Deployed my own smart contract', 'Built a Web3 game', etc."
          disabled={saving}
          className="min-h-[100px] resize-none border-white/10 bg-black/30 text-white focus-visible:border-cyan-400/50"
        />
        <FieldDescription className="text-white/40">Limited to 50 characters.</FieldDescription>
      </Field>

      <Card className="border-white/10 bg-black/20">
        <CardContent className="p-5">
          <Field orientation="horizontal">
            <Checkbox
              checked={useDifferentWallet}
              disabled={saving}
              onCheckedChange={(checked) => {
                const enabled = checked === true
                setUseDifferentWallet(enabled)
                if (!enabled) setWalletAddress('')
              }}
              className="mt-1 border-white/20 bg-black/40 text-cyan-400"
            />
            <FieldContent>
              <FieldTitle className="text-white">Send this NFT to a different wallet</FieldTitle>
              <FieldDescription className="text-white/60">
                Enable this if you want to specify a separate recipient wallet for minting.
              </FieldDescription>
            </FieldContent>
          </Field>

          {useDifferentWallet && (
            <Field className="mt-4">
              <FieldLabel htmlFor="walletAddress" className="text-white">Wallet Address</FieldLabel>
              <Input
                id="walletAddress"
                type="text"
                name="walletAddress"
                value={walletAddress}
                onChange={(event) => setWalletAddress(event.target.value)}
                placeholder="0x..."
                disabled={saving}
                className="border-white/10 bg-black/30 text-white focus-visible:border-cyan-400/50"
              />
            </Field>
          )}
        </CardContent>
      </Card>

      <NftConsentField hasConsented={hasConsented} saving={saving} setHasConsented={setHasConsented} />

      <div className="flex justify-center">
        <Button
          type="submit"
          disabled={!hasConsented || saving}
          className="bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:bg-cyan-500/60 disabled:text-slate-900/70"
        >
          {saving && <Spinner data-icon="inline-start" />}
          {saving ? 'Saving...' : 'Submit'}
        </Button>
      </div>
    </form>
  )
}

function NftGenerationKit({
  copiedPrompt,
  handleCopyPrompt,
}: Pick<NftStatusController, 'copiedPrompt' | 'handleCopyPrompt'>) {
  return (
    <Card className="border-blue-800/40 bg-blue-900/10">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-blue-300">Nano Banana Generation Kit</CardTitle>
        <CardDescription className="text-gray-300">
          Want your NFT to match the club&apos;s high-fashion aesthetic? Download these assets and upload them to the AI as style references.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline" className="flex-1 border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white">
            <a href="/assets/tbc-logo.png" download="TBC_Logo.png">
              <FileImageIcon data-icon="inline-start" />
              Download TBC Logo
            </a>
          </Button>
          <Button asChild variant="outline" className="flex-1 border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white">
            <a href="/assets/style-reference.jpeg" download="style-reference.jpeg">
              <FileImageIcon data-icon="inline-start" />
              Download Style Reference
            </a>
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={handleCopyPrompt}
          className="group relative h-auto w-full justify-start rounded-lg border border-gray-700/50 bg-gray-900/50 p-3 text-left transition hover:bg-gray-800 hover:text-white"
        >
          <span className="flex w-full flex-col">
            <span className="mb-1 flex items-center justify-between gap-3 text-sm text-blue-200">
              <strong>Recommended Prompt:</strong>
              <span className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                <CopyIcon data-icon="inline-start" aria-hidden="true" />
                {copiedPrompt ? 'Copied to clipboard!' : 'Click to copy'}
              </span>
            </span>
            <span className="line-clamp-4 text-xs text-wrap italic text-gray-400 transition-all group-hover:line-clamp-none">
              &quot;Create a premium NFT profile avatar for a member of the TBC(tum blockchain club)... (Click to copy full prompt)&quot;
            </span>
          </span>
        </Button>
      </CardContent>
    </Card>
  )
}

function NftConsentField({
  hasConsented,
  saving,
  setHasConsented,
}: Pick<NftStatusController, 'hasConsented' | 'saving' | 'setHasConsented'>) {
  return (
    <Alert className="border-red-900/30 bg-red-900/10">
      <Field orientation="horizontal">
        <Checkbox
          id="consent"
          required
          checked={hasConsented}
          disabled={saving}
          onCheckedChange={(checked) => setHasConsented(checked === true)}
          className="mt-1 size-5 border-gray-700 bg-gray-900 text-blue-600"
        />
        <FieldContent>
          <FieldLabel htmlFor="consent" className="text-gray-200">
            Data Permanence & Terms of Service Agreement
          </FieldLabel>
          <FieldDescription className="text-xs text-gray-400">
            I understand that a cryptographic record of this NFT will be permanently minted on the blockchain.
            While the club maintains the ability to delete off-chain hosted images upon request, the on-chain transaction history cannot be reversed, edited, or deleted.
          </FieldDescription>
          <FieldDescription className="text-xs text-gray-400">
            By checking this box, I also agree to the TUM Blockchain Club&apos;s{' '}
            <a href="/terms" target="_blank" className="text-blue-400 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" className="text-blue-400 hover:underline">Privacy Policy</a>.
          </FieldDescription>
        </FieldContent>
      </Field>
    </Alert>
  )
}

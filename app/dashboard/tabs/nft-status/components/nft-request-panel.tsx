import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { NftApplicationForm } from './nft-application-form'
import { NftRequestSummary } from './nft-request-summary'
import type { NftStatusSectionsProps } from './types'

export function NftRequestPanel({ state }: NftStatusSectionsProps) {
  const { existingRequest, hasMintedNft, loadingExistingRequest } = state

  return (
    <Card className="mt-6 border-white/10 bg-white/5 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white">
          {existingRequest ? (hasMintedNft ? 'Your Minted Membership NFT' : 'Your NFT Request Summary') : 'NFT Application Form'}
        </CardTitle>
        <CardDescription className="text-white/60">
          {existingRequest
            ? hasMintedNft
              ? 'Your NFT is live. Review the minted artwork, transaction hash, and saved request details below.'
              : 'You already have a saved NFT request. Review the details below.'
            : 'Provide the details you want us to use when preparing your membership NFT.'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <NftStatusMessages state={state} />
        {loadingExistingRequest ? (
          <NftRequestSkeleton />
        ) : existingRequest ? (
          <NftRequestSummary state={state} />
        ) : (
          <NftApplicationForm state={state} />
        )}
      </CardContent>
    </Card>
  )
}

function NftStatusMessages({ state }: NftStatusSectionsProps) {
  const { requestLookupError, submissionMessage } = state

  return (
    <>
      {requestLookupError && (
        <Alert variant="destructive" className="mb-6 border-red-500/30 bg-red-500/10 text-red-300">
          <AlertDescription className="text-current">{requestLookupError}</AlertDescription>
        </Alert>
      )}

      {submissionMessage && (
        <Alert
          variant={submissionMessage.type === 'success' ? 'default' : 'destructive'}
          className={`mb-6 ${submissionMessage.type === 'success'
            ? 'border-green-500/30 bg-green-500/10 text-green-300'
            : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          <AlertDescription className="text-current">{submissionMessage.text}</AlertDescription>
        </Alert>
      )}
    </>
  )
}

function NftRequestSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <Skeleton className="aspect-[4/5] rounded-2xl border border-white/10 bg-white/[0.03]" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 rounded-2xl border border-white/10 bg-white/[0.03]" />
        <Skeleton className="h-40 rounded-2xl border border-white/10 bg-white/[0.03]" />
      </div>
    </div>
  )
}

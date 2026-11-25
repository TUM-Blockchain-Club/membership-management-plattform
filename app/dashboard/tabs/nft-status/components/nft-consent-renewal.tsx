'use client'

import { useState } from 'react'
import { NFT_LEGAL_VERSION } from '@/lib/nftLegal'
import { Button } from '@/components/ui/button'
import { NftConsentField } from './nft-application-form'
import type { NftStatusSectionsProps } from './types'

export function NftConsentRenewal({ state }: NftStatusSectionsProps) {
  const [accepted, setAccepted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  if (!state.existingRequest?.consent_required || state.existingRequest.asset_state === 'burned') return null
  return <form className="flex flex-col gap-4" onSubmit={async event => {
    event.preventDefault()
    if (!accepted || saving) return
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/nft-requests/current/consent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publication_consent: accepted, legal_version: NFT_LEGAL_VERSION }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not save consent.')
      await state.refreshRequest()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save consent.') }
    finally { setSaving(false) }
  }}>
    <p className="text-sm text-muted-foreground">Please review your saved details below and confirm publication. Your existing request stays in place; publishing, updates and transfers are paused until you consent.</p>
    <NftConsentField hasConsented={accepted} saving={saving} setHasConsented={setAccepted} />
    <Button type="submit" disabled={!accepted || saving} className="self-start">{saving ? 'Saving…' : 'Confirm publication consent'}</Button>
    {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
  </form>
}

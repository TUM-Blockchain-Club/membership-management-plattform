'use client'
import { useEffect, useState } from 'react'
import { NftPreview } from '@/components/nft-preview'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

export function NftDraftPreview({ file, displayName, funFacts }: { file: File | null; displayName: string; funFacts: string }) {
  const [preview, setPreview] = useState<{ file: File; name: string; flex: string; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(false)
  const current = preview?.file === file && preview.name === displayName && preview.flex === funFacts ? preview.url : null
  useEffect(() => {
    if (!file || !displayName.trim()) return
    const controller = new AbortController()
    let objectUrl: string | null = null
    const timer = setTimeout(async () => {
      setError(null); setLoading(true)
      try {
        if (file.size > 3_000_000) throw new Error('Choose an image smaller than 3 MB for the preview.')
        const body = new FormData(); body.set('picture', file); body.set('displayName', displayName); body.set('funFacts', funFacts)
        const response = await fetch('/api/nft-requests/draft-preview', { method: 'POST', body, signal: controller.signal })
        if (!response.ok) throw new Error(await response.text())
        const blob = await response.blob()
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        setPreview({ file, name: displayName, flex: funFacts, url: objectUrl })
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not render preview.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }, 700)
    return () => { clearTimeout(timer); controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [file, displayName, funFacts, attempt])
  if (!file) return null
  return <Card><CardHeader><CardTitle>Your NFT preview</CardTitle><CardDescription>Uses the same artwork renderer as minting. Your image is processed privately; nothing is published or submitted. Final artwork may change during review.</CardDescription></CardHeader>
    <CardContent className="flex flex-col items-center gap-3">
      {!displayName.trim() ? <p className="text-sm text-muted-foreground">Enter a display name to see your preview.</p> : error ? <Alert variant="destructive"><AlertDescription>{error}<Button type="button" variant="outline" onClick={() => setAttempt(value => value + 1)}>Try again</Button></AlertDescription></Alert> : current && !loading ? <div className="w-full max-w-80"><NftPreview imageUrl={current} displayName={displayName} draft /></div> : <div role="status" className="flex items-center gap-2 py-12"><Spinner />Preparing your preview…</div>}
    </CardContent></Card>
}

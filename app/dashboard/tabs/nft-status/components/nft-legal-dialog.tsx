'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { NFT_LEGAL_VERSION, NFT_PRIVACY, NFT_TERMS } from '@/lib/nftLegal'

export function NftLegalDialog({ document }: { document: 'terms' | 'privacy' }) {
  const isTerms = document === 'terms'
  const label = isTerms ? 'Terms of Service' : 'Privacy Policy'
  const sections = isTerms ? NFT_TERMS : NFT_PRIVACY

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="rounded-sm text-blue-400 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b p-5 pr-12">
          <DialogTitle>Membership NFT {isTerms ? 'Terms' : 'Privacy Policy'}</DialogTitle>
          <DialogDescription>Effective September 13, 2026 · Version {NFT_LEGAL_VERSION}</DialogDescription>
        </DialogHeader>
        <div tabIndex={0} role="region" aria-label={`${label} text`} className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
          {sections.map((section) => (
            <section key={section.title} className="space-y-2">
              <h3 className="text-sm font-medium">{section.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{section.text}</p>
            </section>
          ))}
        </div>
        <DialogFooter className="mx-0 mb-0 shrink-0">
          <DialogClose asChild>
            <Button type="button" variant="outline">Back to application</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

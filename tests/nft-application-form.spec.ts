import { expect, test } from '@playwright/test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { NftApplicationForm } from '../app/dashboard/tabs/nft-status/components/nft-application-form'
import type { NftStatusController } from '../app/dashboard/tabs/nft-status/useNftStatus'

const renderForm = (state: Partial<NftStatusController>) =>
  renderToStaticMarkup(createElement(NftApplicationForm, {
    state: {
      batch: 'WS25', copiedPrompt: false, displayName: 'Ada L.', funFacts: '', hasConsented: false,
      hasMintedNft: false, mintDestination: 'club', requestedWalletAddress: '', saving: false,
      selectedFile: null, selectedFileName: null, ...state,
    } as NftStatusController,
  }))

test('mint destination is a radio group that marks exactly the selected wallet as checked', () => {
  const html = renderForm({ mintDestination: 'member' })
  expect(html).toContain('role="radiogroup"')
  expect(html).toMatch(/role="radio" aria-checked="true"[^>]*aria-label="Mint to my Solana wallet"/)
  expect(html).toMatch(/role="radio" aria-checked="false"[^>]*aria-label="Mint to the TBC club wallet"/)
  expect(html).toContain('id="requested-wallet-address"')
})

test('a profile update of a minted NFT does not offer the mint destination again', () => {
  const html = renderForm({ hasMintedNft: true, mintDestination: 'member' })
  expect(html).not.toContain('role="radiogroup"')
  expect(html).not.toContain('Where should we mint your NFT?')
  expect(html).not.toContain('id="requested-wallet-address"')
})

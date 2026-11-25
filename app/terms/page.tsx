import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { NFT_TERMS, NFT_LEGAL_VERSION } from '@/lib/nftLegal'

export const metadata = { title: 'Membership NFT Terms | TBC Member Portal' }

export default function LegalPage() {
  return <LegalPageLayout title="Membership NFT Terms" description={`Effective September 13, 2026 · Version ${NFT_LEGAL_VERSION}`} sections={NFT_TERMS.map(section => ({ title: section.title, content: <p>{section.text}</p> }))} />
}

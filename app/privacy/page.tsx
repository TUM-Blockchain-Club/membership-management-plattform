import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { NFT_PRIVACY, NFT_LEGAL_VERSION } from '@/lib/nftLegal'

export const metadata = { title: 'Membership NFT Privacy Policy | TBC Member Portal' }

export default function LegalPage() {
  return <LegalPageLayout title="Membership NFT Privacy Policy" description={`Effective September 13, 2026 · Version ${NFT_LEGAL_VERSION}`} sections={NFT_PRIVACY.map(section => ({ title: section.title, content: <p>{section.text}</p> }))} />
}

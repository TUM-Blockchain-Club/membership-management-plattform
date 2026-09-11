import type { Metadata } from "next"
import Link from "next/link"
import { LegalPageLayout } from "@/components/legal/LegalPageLayout"

export const metadata: Metadata = {
  title: "Membership NFT Privacy Policy | TBC Member Portal",
  description: "Privacy information for the TUM Blockchain Club membership NFT.",
}

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Membership NFT Privacy Policy"
      description="Effective September 11, 2026. This policy explains how data submitted for a membership NFT is handled."
      sections={[
        {
          title: "1. Responsible organization",
          content: (
            <p>
              TUM Blockchain Club e.V., Arcisstraße 21, 80333 Munich, Germany. Privacy questions and requests can be
              sent to <a href="mailto:info@tum-blockchain.com" className="text-primary hover:underline">info@tum-blockchain.com</a>.
            </p>
          ),
        },
        {
          title: "2. Data we process",
          content: (
            <p>
              We process your member record, display name, department, batch, membership status, submitted portrait,
              member statement, consent state, NFT request and review state, wallet address, asset address, and related
              Solana transaction identifiers.
            </p>
          ),
        },
        {
          title: "3. Purpose and legal basis",
          content: (
            <p>
              We use the data to review your request, create and administer the membership NFT, confirm wallet claims,
              reflect membership changes, prevent misuse, and reconcile platform records with Solana. Publication of
              your portrait and profile fields is based on the consent you give in the request form. Operational records
              are processed to provide and secure the requested service.
            </p>
          ),
        },
        {
          title: "4. Private and public storage",
          content: (
            <>
              <p>The source portrait remains in private platform storage and is available only through guarded server routes.</p>
              <p>
                Approved rendered artwork and NFT metadata are stored publicly so wallets and explorers can display the
                NFT. Solana transaction history, asset and wallet addresses are also public. Infrastructure providers and
                independent Solana participants process this public data.
              </p>
            </>
          ),
        },
        {
          title: "5. Retention, deletion, and withdrawal",
          content: (
            <p>
              Unminted requests can be deleted through the portal. When an NFT is revoked, the club deletes the source
              portrait and hosted public artwork and metadata, and redacts the request record where operationally
              possible. You may withdraw consent for future hosted publication by contacting us. Withdrawal cannot
              erase earlier Solana transactions or copies already cached by independent third parties.
            </p>
          ),
        },
        {
          title: "6. Your choices and rights",
          content: (
            <p>
              You may ask for access, correction, deletion, restriction, portability, or object to processing where
              applicable. You may also contact the competent data protection authority. Blockchain permanence can limit
              what the club is technically able to erase.
            </p>
          ),
        },
        {
          title: "7. Related terms",
          content: (
            <p>
              Use of the membership NFT is also governed by the <Link href="/terms" className="text-primary hover:underline">Membership NFT Terms</Link>.
            </p>
          ),
        },
      ]}
    />
  )
}

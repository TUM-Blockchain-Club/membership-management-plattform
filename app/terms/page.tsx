import type { Metadata } from "next"
import Link from "next/link"
import { LegalPageLayout } from "@/components/legal/LegalPageLayout"

export const metadata: Metadata = {
  title: "Membership NFT Terms | TBC Member Portal",
  description: "Terms for the TUM Blockchain Club membership NFT.",
}

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Membership NFT Terms"
      description="Effective September 11, 2026. These terms apply when you request, receive, claim, or hold a membership NFT through the TBC Member Portal."
      sections={[
        {
          title: "1. What the membership NFT is",
          content: (
            <p>
              The NFT is a digital club membership collectible issued on Solana. It documents an approved membership
              status but is not a financial product, investment, transferable club membership, or proof of identity.
            </p>
          ),
        },
        {
          title: "2. Your submission",
          content: (
            <>
              <p>You may submit a display name, portrait, and short member statement. Do not use a full legal name as your display name.</p>
              <p>You confirm that you may provide and publish the submitted material and that it does not violate another person&apos;s rights.</p>
            </>
          ),
        },
        {
          title: "3. Public and permanent data",
          content: (
            <p>
              NFT artwork and metadata are publicly accessible. Solana transaction history is public and cannot be
              deleted. The club may remove hosted files after a revocation, but wallets, explorers, and other third
              parties may retain cached copies.
            </p>
          ),
        },
        {
          title: "4. Club authority and custody",
          content: (
            <p>
              The club initially holds the NFT and remains its permanent update, freeze, transfer, and burn authority.
              A wallet transfer requires a member request and board confirmation. The club may update the NFT when the
              membership status changes and may burn it when membership ends, after removal, or on revocation.
            </p>
          ),
        },
        {
          title: "5. Wallet responsibility and availability",
          content: (
            <>
              <p>You are responsible for entering the correct wallet address and securing the wallet after a confirmed transfer.</p>
              <p>The service depends on Solana, RPC providers, storage providers, and wallet software. Availability and continued third-party display cannot be guaranteed.</p>
            </>
          ),
        },
        {
          title: "6. Privacy and contact",
          content: (
            <p>
              How personal data is handled is described in the <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              Questions can be sent to <a href="mailto:info@tum-blockchain.com" className="text-primary hover:underline">info@tum-blockchain.com</a>.
            </p>
          ),
        },
      ]}
    />
  )
}

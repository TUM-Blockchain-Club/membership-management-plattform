import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowLeftIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type LegalSection = {
  title: string
  content: ReactNode
}

type LegalPageLayoutProps = {
  description: string
  sections: LegalSection[]
  title: string
}

export function LegalPageLayout({ description, sections, title }: LegalPageLayoutProps) {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="TUM Blockchain Club member portal">
            <Image
              src="/tbc-wordmark.png"
              alt="TUM Blockchain Club"
              width={180}
              height={50}
              className="h-8 w-auto object-contain brightness-0 invert opacity-90"
              priority
            />
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/nft-status">
              <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
              Member portal
            </Link>
          </Button>
        </header>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-2xl sm:text-3xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-7 pt-2">
            {sections.map((section) => (
              <section key={section.title} className="flex flex-col gap-2">
                <h2 className="text-base font-medium text-foreground">{section.title}</h2>
                <div className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
                  {section.content}
                </div>
              </section>
            ))}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          TUM Blockchain Club e.V. · Arcisstraße 21, 80333 Munich, Germany
        </p>
      </div>
    </main>
  )
}

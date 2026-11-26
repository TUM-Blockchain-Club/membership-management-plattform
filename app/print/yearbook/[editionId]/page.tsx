import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { isUuid } from '@/lib/yearbook'
import { getYearbookViewer, loadYearbookExport } from '@/lib/server/yearbook'
import { PrintButton } from './PrintButton'

export const metadata: Metadata = {
  title: 'Yearbook print view – TBC Member Portal',
  robots: { index: false, follow: false },
}

// Photo links only need to outlive this print session.
const PRINT_PHOTO_URL_SECONDS = 2 * 60 * 60

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export default async function YearbookPrintPage({ params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params
  const viewer = await getYearbookViewer()
  if (!viewer) redirect('/signin')
  if (!viewer.canManage) redirect('/yearbook')
  if (!isUuid(editionId)) notFound()

  const data = await loadYearbookExport(viewer.admin, editionId, PRINT_PHOTO_URL_SECONDS)
  if (!data) notFound()

  return (
    <div className="yearbook-print min-h-screen bg-neutral-100 text-neutral-900">
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          html, body { background: #fff !important; }
          .yearbook-print { background: #fff !important; }
          .yearbook-print .no-print { display: none !important; }
          .yearbook-print .sheet { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: auto !important; min-height: 0 !important; }
          .yearbook-print .sheet + .sheet { break-before: page; }
        }
        .yearbook-print .message { break-inside: avoid; }
      `}</style>

      <header className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-white/90 px-6 py-3 backdrop-blur">
        <div>
          <p className="font-semibold">{data.edition.title} · print view</p>
          <p className="text-sm text-neutral-500">
            {data.participantCount} pages · {data.messageCount} messages · choose &ldquo;Save as PDF&rdquo; in the print dialog for the print shop.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/yearbook/admin?edition=${data.edition.id}`} className="text-sm text-neutral-600 underline-offset-4 hover:underline">
            Back to admin
          </Link>
          <PrintButton />
        </div>
      </header>

      <main className="flex flex-col items-center gap-8 py-8">
        <section className="sheet flex min-h-[297mm] w-[210mm] flex-col items-center justify-center gap-4 bg-white p-[14mm] text-center shadow-lg">
          {/* Static asset bundled with the app. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/tbc-logo.png" alt="" className="size-28 rounded-2xl" />
          <h1 className="text-5xl font-bold tracking-tight">{data.edition.title}</h1>
          <p className="text-lg text-neutral-500">TUM Blockchain Club</p>
          <p className="mt-8 text-sm text-neutral-400">
            {data.participantCount} members · {data.messageCount} messages · {format(new Date(data.generatedAt), 'MMMM yyyy')}
          </p>
        </section>

        {data.pages.length === 0 && (
          <p className="no-print text-neutral-500">Nobody has joined this yearbook yet, so there are no pages to print.</p>
        )}

        {data.pages.map((page) => (
          <section key={page.memberId} className="sheet flex min-h-[297mm] w-[210mm] flex-col gap-6 bg-white p-[14mm] shadow-lg">
            <div className="flex items-center gap-6 border-b border-neutral-200 pb-6">
              {page.portraitUrl ? (
                // Signed storage URLs and member pictures come from several hosts.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.portraitUrl} alt="" className="size-40 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex size-40 shrink-0 items-center justify-center rounded-xl bg-neutral-200 text-4xl font-semibold text-neutral-500">
                  {initials(page.name)}
                </div>
              )}
              <div className="flex min-w-0 flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight">{page.name}</h2>
                {page.department && <p className="text-neutral-500">{page.department}</p>}
                {page.quote && <p className="text-lg italic text-neutral-700">&ldquo;{page.quote}&rdquo;</p>}
              </div>
            </div>

            {page.messages.length === 0 ? (
              <p className="text-neutral-400">No messages yet.</p>
            ) : (
              <div className="columns-2 gap-5">
                {page.messages.map((message) => (
                  <article key={message.id} className="message mb-5 rounded-lg border border-neutral-200 p-4">
                    <p className="whitespace-pre-line text-sm leading-relaxed">{message.body}</p>
                    {message.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={message.photoUrl} alt="" className="mt-3 w-full rounded-md object-cover" />
                    )}
                    <p className="mt-3 text-right text-xs font-medium text-neutral-500">– {message.authorName}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </main>
    </div>
  )
}

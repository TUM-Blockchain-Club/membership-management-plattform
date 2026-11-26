import { isUuid, toYearbookCsv, yearbookExportFileName } from '@/lib/yearbook'
import { loadYearbookExport, requireYearbookAdmin, yearbookErrorResponse } from '@/lib/server/yearbook'

/**
 * Downloads the printable yearbook: participants' pages with messages from other
 * participants. ?format=csv (default) or json. Photo links stay valid for 7 days.
 */
export async function GET(request: Request, props: { params: Promise<{ editionId: string }> }) {
  try {
    const { editionId } = await props.params
    if (!isUuid(editionId)) return Response.json({ error: 'Yearbook not found.' }, { status: 404 })
    const { admin } = await requireYearbookAdmin()
    const format = new URL(request.url).searchParams.get('format') === 'json' ? 'json' : 'csv'

    const data = await loadYearbookExport(admin, editionId)
    if (!data) return Response.json({ error: 'Yearbook not found.' }, { status: 404 })

    const fileName = yearbookExportFileName(data.edition, format)
    const headers = {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    }
    if (format === 'json') {
      return new Response(JSON.stringify(data, null, 2), {
        headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
      })
    }
    return new Response(toYearbookCsv(data.pages), {
      headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8' },
    })
  } catch (error) {
    return yearbookErrorResponse(error, 'Could not export the yearbook.')
  }
}

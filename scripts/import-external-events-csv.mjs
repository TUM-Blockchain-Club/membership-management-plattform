import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_DESCRIPTION = 'External ecosystem event.'
const DAY_MS = 24 * 60 * 60 * 1000

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=')
    return [key, rest.join('=') || 'true']
  })
)

const csvPath = args.get('file')
const todayArg = args.get('today')
const monthsBack = Number(args.get('months-back') ?? 1)
const dryRun = args.get('dry-run') === 'true'

if (!csvPath) {
  console.error('Usage: pnpm exec node scripts/import-external-events-csv.mjs --file=/path/events.csv [--months-back=1] [--today=YYYY-MM-DD] [--dry-run]')
  process.exit(1)
}

const loadEnvFile = (path) => {
  try {
    const content = readFileSync(path, 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
      const [key, ...valueParts] = trimmed.split('=')
      if (!process.env[key]) process.env[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '')
    }
  } catch {
    // The script can also be run with environment variables provided by the shell.
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const parseCsv = (text) => {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((csvRow) => csvRow.some((value) => value.trim()))
}

const normalizeTitle = (value) => value.trim().replace(/\s+/g, ' ').toLowerCase()

const nullableString = (value) => {
  const trimmed = value.trim()
  return trimmed || null
}

const splitNames = (value) =>
  value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)

const parseDate = (value) => {
  const date = new Date(`${value.trim()} 00:00:00 UTC`)
  return Number.isNaN(date.getTime()) ? null : date
}

const parseDateRange = (value) => {
  const parts = value.split('→').map((part) => part.trim()).filter(Boolean)
  const start = parseDate(parts[0] ?? '')
  const end = parseDate(parts[1] ?? parts[0] ?? '')

  if (!start || !end) return null
  return { start, end }
}

const toIsoDate = (date) => date.toISOString()

const priorityValue = (value) => {
  const match = value.toUpperCase().match(/P[1-5]/)
  return match?.[0] ?? null
}

const buildEventTypes = (type, hackathon) => {
  const values = type.split(',').map((part) => part.trim()).filter(Boolean)
  const hasHackathon = values.some((value) => value.toLowerCase() === 'hackathon')

  if (hackathon.trim().toLowerCase() === 'yes' && !hasHackathon) {
    values.push('Hackathon')
  }

  return [...new Set(values)]
}

const today = todayArg ? parseDate(todayArg) : new Date()
if (!today || Number.isNaN(today.getTime())) {
  console.error(`Invalid --today value: ${todayArg}`)
  process.exit(1)
}

const importCutoff = new Date(today.getTime() - monthsBack * 30 * DAY_MS)
importCutoff.setUTCHours(0, 0, 0, 0)

const rawCsv = readFileSync(resolve(csvPath), 'utf8').replace(/^\uFEFF/, '')
const [headerRow, ...dataRows] = parseCsv(rawCsv)
const headers = headerRow.map((header) => header.trim().replace(/^\uFEFF/, ''))
const records = dataRows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ''])))

const importableEvents = []
let skippedOlder = 0
let skippedInvalid = 0

for (const record of records) {
  const title = nullableString(record.Name ?? '')
  const dates = parseDateRange(record.Date ?? '')

  if (!title || !dates) {
    skippedInvalid += 1
    continue
  }

  if (dates.end < importCutoff) {
    skippedOlder += 1
    continue
  }

  const eventTypes = buildEventTypes(record.Type ?? '', record.Hackathon ?? '')
  const city = nullableString(record.City ?? '') ?? nullableString(record.Location ?? '')
  const location = nullableString(record.Location ?? '') ?? city
  const description = nullableString(record.Comment ?? '') ?? DEFAULT_DESCRIPTION

  importableEvents.push({
    title,
    payload: {
      title,
      description,
      start_at: toIsoDate(dates.start),
      end_at: toIsoDate(dates.end),
      location,
      organizer_department: eventTypes.join(', ') || null,
      capacity_total: 0,
      event_kind: 'external',
      event_type: eventTypes.join(', ') || null,
      priority: priorityValue(record.Priority ?? ''),
      external_status: nullableString(record.Status ?? ''),
      city,
      format: nullableString(record.Format ?? ''),
      event_link_url: nullableString(record.Website ?? ''),
      is_hackathon: eventTypes.some((eventType) => eventType.toLowerCase() === 'hackathon'),
      attending_names: splitNames(record.Attending ?? ''),
      all_day: true,
    },
  })
}

console.info(`CSV rows: ${records.length}`)
console.info(`Import cutoff: ${importCutoff.toISOString().slice(0, 10)}`)
console.info(`Importable events: ${importableEvents.length}`)
console.info(`Skipped older than ${monthsBack} month(s): ${skippedOlder}`)
console.info(`Skipped invalid rows: ${skippedInvalid}`)

if (dryRun) {
  console.info('Dry run only; no database changes were made.')
  process.exit(0)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: existingRows, error: existingError } = await supabase
  .from('events')
  .select('id, title')

if (existingError) {
  console.error(`Could not load existing events: ${existingError.message}`)
  process.exit(1)
}

const existingByTitle = new Map()
for (const event of existingRows ?? []) {
  existingByTitle.set(normalizeTitle(event.title ?? ''), event)
}

let inserted = 0
let updated = 0

for (const event of importableEvents) {
  const existing = existingByTitle.get(normalizeTitle(event.title))

  if (existing) {
    const { error } = await supabase
      .from('events')
      .update(event.payload)
      .eq('id', existing.id)

    if (error) {
      console.error(`Could not update "${event.title}": ${error.message}`)
      process.exit(1)
    }

    updated += 1
    continue
  }

  const { data, error } = await supabase
    .from('events')
    .insert(event.payload)
    .select('id, title')
    .single()

  if (error) {
    console.error(`Could not insert "${event.title}": ${error.message}`)
    process.exit(1)
  }

  existingByTitle.set(normalizeTitle(event.title), data)
  inserted += 1
}

console.info(`Inserted: ${inserted}`)
console.info(`Updated: ${updated}`)

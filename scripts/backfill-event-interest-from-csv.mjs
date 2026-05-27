import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=')
    return [key, rest.join('=') || 'true']
  })
)

const csvPath = args.get('file')
const dryRun = args.get('dry-run') === 'true'

if (!csvPath) {
  console.error('Usage: pnpm exec node scripts/backfill-event-interest-from-csv.mjs --file=/path/events.csv [--dry-run]')
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
    // Allows CI/terminal environments to provide variables directly.
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

const normalize = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

const splitNames = (value) =>
  value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)

const rawCsv = readFileSync(resolve(csvPath), 'utf8').replace(/^\uFEFF/, '')
const [headerRow, ...dataRows] = parseCsv(rawCsv)
const headers = headerRow.map((header) => header.trim().replace(/^\uFEFF/, ''))
const records = dataRows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ''])))

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const [{ data: events, error: eventsError }, { data: members, error: membersError }] = await Promise.all([
  supabase.from('events').select('id, title'),
  supabase.from('members_main').select('id, Name, "TBC Email"'),
])

if (eventsError) {
  console.error(`Could not load events: ${eventsError.message}`)
  process.exit(1)
}

if (membersError) {
  console.error(`Could not load members: ${membersError.message}`)
  process.exit(1)
}

const eventsByTitle = new Map((events ?? []).map((event) => [normalize(event.title ?? ''), event]))
const membersByExactName = new Map()

for (const member of members ?? []) {
  const key = normalize(member.Name ?? '')
  if (!key) continue
  const existing = membersByExactName.get(key) ?? []
  existing.push(member)
  membersByExactName.set(key, existing)
}

const findMember = (csvName) => {
  const normalizedName = normalize(csvName)
  if (!normalizedName) return { match: null, reason: 'empty' }

  const exact = membersByExactName.get(normalizedName) ?? []
  if (exact.length === 1) return { match: exact[0], reason: 'exact' }
  if (exact.length > 1) return { match: null, reason: `ambiguous exact: ${exact.map((m) => `${m.id}:${m.Name}`).join('; ')}` }

  const candidates = (members ?? []).filter((member) => {
    const memberName = normalize(member.Name ?? '')
    if (!memberName) return false
    return memberName.startsWith(`${normalizedName} `) || memberName.includes(` ${normalizedName} `) || memberName.endsWith(` ${normalizedName}`)
  })

  if (candidates.length === 1) return { match: candidates[0], reason: 'unique partial' }
  if (candidates.length > 1) return { match: null, reason: `ambiguous partial: ${candidates.map((m) => `${m.id}:${m.Name}`).join('; ')}` }

  return { match: null, reason: 'no member match' }
}

const desiredRows = []
const unmatchedEvents = []
const unmatchedNames = []
const matched = []

for (const record of records) {
  const eventTitle = record.Name?.trim()
  if (!eventTitle) continue

  const event = eventsByTitle.get(normalize(eventTitle))
  if (!event) {
    if (splitNames(record.Interested ?? '').length > 0) unmatchedEvents.push(eventTitle)
    continue
  }

  for (const csvName of splitNames(record.Interested ?? '')) {
    const { match, reason } = findMember(csvName)
    if (!match) {
      unmatchedNames.push({ event: eventTitle, name: csvName, reason })
      continue
    }

    desiredRows.push({ event_id: event.id, member_id: match.id })
    matched.push({ event: eventTitle, csvName, member: `${match.Name} (#${match.id})`, match: reason })
  }
}

const uniqueRows = [...new Map(desiredRows.map((row) => [`${row.event_id}:${row.member_id}`, row])).values()]

console.info(`CSV rows: ${records.length}`)
console.info(`Matched interest entries: ${matched.length}`)
console.info(`Unique event_interest rows to ensure: ${uniqueRows.length}`)
console.info(`Unmatched event titles: ${unmatchedEvents.length}`)
console.info(`Unmatched interested names: ${unmatchedNames.length}`)

if (matched.length > 0) {
  console.info('\nMatched:')
  for (const item of matched) {
    console.info(`- ${item.event}: "${item.csvName}" -> ${item.member} (${item.match})`)
  }
}

if (unmatchedEvents.length > 0) {
  console.info('\nUnmatched events:')
  for (const title of unmatchedEvents) console.info(`- ${title}`)
}

if (unmatchedNames.length > 0) {
  console.info('\nUnmatched names:')
  for (const item of unmatchedNames) console.info(`- ${item.event}: "${item.name}" (${item.reason})`)
}

if (dryRun) {
  console.info('\nDry run only; no database changes were made.')
  process.exit(0)
}

if (uniqueRows.length === 0) {
  console.info('No rows to insert.')
  process.exit(0)
}

const { error: insertError } = await supabase
  .from('event_interest')
  .upsert(uniqueRows, { onConflict: 'event_id,member_id', ignoreDuplicates: true })

if (insertError) {
  console.error(`Could not upsert event_interest rows: ${insertError.message}`)
  process.exit(1)
}

console.info(`Ensured ${uniqueRows.length} event_interest rows.`)

#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { getGoogleAccessToken, type Account } from '../src/lib/google-auth.js'

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    personal: { type: 'boolean', short: 'p' },
    calendar: { type: 'string', short: 'c' },
    title: { type: 'string', short: 't' },
    start: { type: 'string', short: 's' },
    end: { type: 'string', short: 'e' },
    location: { type: 'string', short: 'l' },
    description: { type: 'string', short: 'd' },
    json: { type: 'boolean', short: 'j' },
  },
})

const account: Account = values.personal ? 'personal' : 'work'

function printHelp() {
  console.log(`Usage: calendar-update <event-id> --calendar <calendar-id> [options]

Options:
  -p, --personal          Use personal account (default: work)
  -c, --calendar <id>     Calendar ID (required)
  -t, --title <text>      New title
  -s, --start <datetime>  New start time
  -e, --end <datetime>    New end time
  -l, --location <text>   New location
  -d, --description <text> New description
  -j, --json              Output as JSON

Examples:
  calendar-update abc123 -c primary -t "Updated Meeting"
  calendar-update abc123 -c primary -s "2024-01-20 15:00" -e "2024-01-20 16:00"
`)
}

function parseDateTime(input: string): string {
  if (input.includes('T')) return input
  const parts = input.split(' ')
  if (parts.length === 2) {
    const [date, time] = parts
    return `${date}T${time}:00`
  }
  return input
}

async function main() {
  if (values.help || positionals.length < 1 || !values.calendar) {
    printHelp()
    process.exit(values.help ? 0 : 1)
  }

  const [eventId] = positionals
  const calendarId = values.calendar

  const tokenResult = await getGoogleAccessToken(account)
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }

  const headers = { Authorization: `Bearer ${tokenResult.data}` }

  // First, get the existing event
  const getRes = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { headers }
  )

  if (!getRes.ok) {
    console.error(`Failed to get event: ${getRes.status} ${await getRes.text()}`)
    process.exit(1)
  }

  const existing = await getRes.json() as Record<string, unknown>

  // Build update object
  const update: Record<string, unknown> = {}

  if (values.title) update.summary = values.title
  if (values.location) update.location = values.location
  if (values.description) update.description = values.description

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

  if (values.start) {
    const startDt = parseDateTime(values.start)
    update.start = { dateTime: startDt, timeZone: tz }
  }

  if (values.end) {
    const endDt = parseDateTime(values.end)
    update.end = { dateTime: endDt, timeZone: tz }
  }

  // Merge with existing
  const merged = { ...existing, ...update }

  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(merged),
    }
  )

  if (!res.ok) {
    console.error(`Failed: ${res.status} ${await res.text()}`)
    process.exit(1)
  }

  const updated = await res.json() as {
    id: string
    summary: string
    start: { dateTime?: string; date?: string }
  }

  if (values.json) {
    console.log(JSON.stringify(updated, null, 2))
  } else {
    console.log(`Updated event:`)
    console.log(`  Title: ${updated.summary}`)
    console.log(`  ID: ${updated.id}`)
    console.log(`  Start: ${updated.start.dateTime ?? updated.start.date}`)
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

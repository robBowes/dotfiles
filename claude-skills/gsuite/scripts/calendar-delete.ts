#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { getGoogleAccessToken } from '../src/lib/google-auth.js'

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    calendar: { type: 'string', short: 'c' },
  },
})

function printHelp() {
  console.log(`Usage: calendar-delete <event-id> --calendar <calendar-id>

Delete a calendar event.

Options:
  -c, --calendar <id>     Calendar ID (required)

Examples:
  calendar-delete abc123 -c primary
  calendar-delete abc123 -c work@group.calendar.google.com
`)
}

async function main() {
  if (values.help || positionals.length < 1 || !values.calendar) {
    printHelp()
    process.exit(values.help ? 0 : 1)
  }

  const [eventId] = positionals
  const calendarId = values.calendar

  const tokenResult = await getGoogleAccessToken()
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }

  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenResult.data}` },
    }
  )

  if (!res.ok) {
    console.error(`Failed: ${res.status} ${await res.text()}`)
    process.exit(1)
  }

  console.log(`Deleted event ${eventId}`)
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { getGoogleAccessToken } from '../src/lib/google-auth.js'
import { fetchJson } from '../src/lib/api.js'

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    calendar: { type: 'string', short: 'c' },
    start: { type: 'string', short: 's' },
    end: { type: 'string', short: 'e' },
    allday: { type: 'boolean' },
    location: { type: 'string', short: 'l' },
    description: { type: 'string', short: 'd' },
    json: { type: 'boolean', short: 'j' },
  },
})

interface CalendarListResponse {
  items?: { id: string; summary: string; primary?: boolean }[]
}

function printHelp() {
  console.log(`Usage: calendar-create <title> --start <datetime> [options]

Options:
  -c, --calendar <id>     Calendar ID (default: primary)
  -s, --start <datetime>  Start time (ISO 8601 or "2024-01-20 14:00")
  -e, --end <datetime>    End time (default: 1 hour after start)
  --allday                Create all-day event (use date only: 2024-01-20)
  -l, --location <text>   Event location
  -d, --description <text> Event description
  -j, --json              Output as JSON

Examples:
  calendar-create "Meeting" -s "2024-01-20 14:00"
  calendar-create "Vacation" -s "2024-01-20" -e "2024-01-25" --allday
  calendar-create "Lunch" -s "2024-01-20 12:00" -e "2024-01-20 13:00" -l "Cafe"
`)
}

function parseDateTime(input: string): string {
  // If already ISO format, return as-is
  if (input.includes('T')) return input

  // Try to parse "YYYY-MM-DD HH:MM" format
  const parts = input.split(' ')
  if (parts.length === 2) {
    const [date, time] = parts
    return `${date}T${time}:00`
  }

  // Just a date
  return input
}

async function main() {
  if (values.help || positionals.length < 1 || !values.start) {
    printHelp()
    process.exit(values.help ? 0 : 1)
  }

  const title = positionals.join(' ')

  const tokenResult = await getGoogleAccessToken()
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }

  const token = tokenResult.data
  const headers = { Authorization: `Bearer ${token}` }

  // Get calendar ID
  let calendarId = values.calendar ?? 'primary'

  if (values.calendar && !values.calendar.includes('@')) {
    // Try to find calendar by name
    const calResult = await fetchJson<CalendarListResponse>(`${CALENDAR_API}/users/me/calendarList`, { headers })
    if (calResult.ok) {
      const found = calResult.data.items?.find(c =>
        c.summary.toLowerCase().includes(values.calendar!.toLowerCase())
      )
      if (found) calendarId = found.id
    }
  }

  // Build event
  const event: Record<string, unknown> = { summary: title }

  if (values.allday) {
    // All-day event uses date only
    event.start = { date: values.start.split('T')[0] }
    event.end = { date: values.end?.split('T')[0] ?? values.start.split('T')[0] }
  } else {
    const startDt = parseDateTime(values.start)
    let endDt = values.end ? parseDateTime(values.end) : null

    if (!endDt) {
      // Default to 1 hour after start
      const startDate = new Date(startDt)
      startDate.setHours(startDate.getHours() + 1)
      endDt = startDate.toISOString()
    }

    event.start = { dateTime: startDt, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
    event.end = { dateTime: endDt, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
  }

  if (values.location) event.location = values.location
  if (values.description) event.description = values.description

  const res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })

  if (!res.ok) {
    console.error(`Failed: ${res.status} ${await res.text()}`)
    process.exit(1)
  }

  const created = await res.json() as {
    id: string
    summary: string
    start: { dateTime?: string; date?: string }
    htmlLink: string
  }

  if (values.json) {
    console.log(JSON.stringify(created, null, 2))
  } else {
    console.log(`Created event:`)
    console.log(`  Title: ${created.summary}`)
    console.log(`  ID: ${created.id}`)
    console.log(`  Calendar: ${calendarId}`)
    console.log(`  Start: ${created.start.dateTime ?? created.start.date}`)
    console.log(`  Link: ${created.htmlLink}`)
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

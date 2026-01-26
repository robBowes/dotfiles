#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { getGoogleAccessToken, type Account } from '../src/lib/google-auth.js'
import { fetchJson } from '../src/lib/api.js'
import { relativeTime } from '../src/lib/time.js'

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

const { values } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    personal: { type: 'boolean', short: 'p' },
    calendar: { type: 'string', short: 'c' },
    days: { type: 'string', short: 'd', default: '1' },
    json: { type: 'boolean', short: 'j' },
  },
})

const account: Account = values.personal ? 'personal' : 'work'

interface CalendarListResponse {
  items?: { id: string; summary: string; selected?: boolean; primary?: boolean }[]
}

interface EventsResponse {
  items?: {
    id: string
    summary?: string
    start: { dateTime?: string; date?: string }
    end: { dateTime?: string; date?: string }
    location?: string
    description?: string
  }[]
}

interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  location?: string
  description?: string
  calendarId: string
  calendarName: string
}

function printHelp() {
  console.log(`Usage: calendar-list [options]

Options:
  -p, --personal          Use personal account (default: work)
  -c, --calendar <name>   Filter by calendar name
  -d, --days <n>          Days to look ahead (default: 1)
  -j, --json              Output as JSON

Examples:
  calendar-list                     # Today's events
  calendar-list -d 7                # Next 7 days
  calendar-list -c "Work"           # Only work calendar
`)
}

async function main() {
  if (values.help) {
    printHelp()
    process.exit(0)
  }

  const tokenResult = await getGoogleAccessToken(account)
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }

  const token = tokenResult.data
  const headers = { Authorization: `Bearer ${token}` }

  // Get calendar list
  const calResult = await fetchJson<CalendarListResponse>(`${CALENDAR_API}/users/me/calendarList`, { headers })
  if (!calResult.ok) {
    console.error(calResult.error)
    process.exit(1)
  }

  let calendars = (calResult.data.items ?? []).filter(c => c.selected !== false)

  if (values.calendar) {
    const filterName = values.calendar.toLowerCase()
    calendars = calendars.filter(c => c.summary.toLowerCase().includes(filterName))
    if (calendars.length === 0) {
      console.error(`No calendar found matching: ${values.calendar}`)
      process.exit(1)
    }
  }

  const allEvents: CalendarEvent[] = []
  const days = parseInt(values.days ?? '1', 10)

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endDate = new Date(startOfDay.getTime() + days * 24 * 60 * 60 * 1000)

  const timeMin = startOfDay.toISOString()
  const timeMax = endDate.toISOString()

  for (const cal of calendars) {
    const eventsResult = await fetchJson<EventsResponse>(
      `${CALENDAR_API}/calendars/${encodeURIComponent(cal.id)}/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
        `&singleEvents=true&orderBy=startTime&maxResults=50`,
      { headers }
    )

    if (!eventsResult.ok) continue

    const events = eventsResult.data.items ?? []
    for (const event of events) {
      const startStr = event.start.dateTime ?? event.start.date ?? ''
      const endStr = event.end.dateTime ?? event.end.date ?? ''

      allEvents.push({
        id: event.id,
        summary: event.summary ?? '(No title)',
        start: startStr,
        end: endStr,
        location: event.location,
        description: event.description,
        calendarId: cal.id,
        calendarName: cal.summary,
      })
    }
  }

  // Sort by start time
  allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  if (values.json) {
    // Also include calendar list info
    console.log(JSON.stringify({
      calendars: calendars.map(c => ({ id: c.id, name: c.summary, primary: c.primary })),
      events: allEvents,
    }, null, 2))
  } else {
    console.log('Calendars:')
    for (const cal of calendars) {
      const primary = cal.primary ? ' (primary)' : ''
      console.log(`  [${cal.id}] ${cal.summary}${primary}`)
    }
    console.log()

    if (allEvents.length === 0) {
      console.log('No events found')
      return
    }

    console.log('Events:')
    for (const event of allEvents) {
      const when = event.start.includes('T')
        ? relativeTime(event.start)
        : event.start + ' (all day)'
      console.log(`[${event.calendarName}] ${event.summary}`)
      console.log(`  Time: ${when}`)
      console.log(`  ID: ${event.id}`)
      console.log(`  Calendar ID: ${event.calendarId}`)
      if (event.location) console.log(`  Location: ${event.location}`)
      console.log()
    }
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

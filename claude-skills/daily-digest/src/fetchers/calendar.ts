import { fetchJson, ok, type Result } from '../lib/api.js'
import { getGoogleAccessToken } from '../lib/google-auth.js'

export interface CalendarEvent {
  id: string
  calendarId: string
  summary: string
  start: string
  end: string
  location?: string
  calendarName: string
}

export interface CalendarData {
  events: CalendarEvent[]
}

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

interface CalendarListResponse {
  items?: { id: string; summary: string; selected?: boolean }[]
}

interface EventsResponse {
  items?: {
    id: string
    summary?: string
    start: { dateTime?: string; date?: string }
    end: { dateTime?: string; date?: string }
    location?: string
  }[]
}

export async function fetchCalendar(): Promise<Result<CalendarData>> {
  const tokenResult = await getGoogleAccessToken()
  if (!tokenResult.ok) return tokenResult

  const token = tokenResult.data
  const headers = { Authorization: `Bearer ${token}` }

  // Get calendar list
  const calResult = await fetchJson<CalendarListResponse>(`${CALENDAR_API}/users/me/calendarList`, { headers })
  if (!calResult.ok) return calResult

  const calendars = (calResult.data.items ?? []).filter(c => c.selected !== false)
  const allEvents: CalendarEvent[] = []

  // Today's time range
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  const timeMin = startOfDay.toISOString()
  const timeMax = endOfDay.toISOString()

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
        calendarId: cal.id,
        summary: event.summary ?? '(No title)',
        start: startStr,
        end: endStr,
        location: event.location,
        calendarName: cal.summary,
      })
    }
  }

  // Sort by start time
  allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  return ok({ events: allEvents })
}

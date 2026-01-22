import { fetchJson, ok, err, type Result } from '../lib/api.js'
import { getGoogleAccessToken } from '../lib/google-auth.js'

export interface GmailMessage {
  id: string
  threadId: string
  from: string
  subject: string
  snippet: string
  date: string
  isRecent: boolean // last 24h
}

export interface GmailData {
  unread: GmailMessage[]
}

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

interface MessageListResponse {
  messages?: { id: string }[]
}

interface MessageResponse {
  id: string
  threadId: string
  snippet: string
  payload: {
    headers: { name: string; value: string }[]
  }
}

export async function fetchGmail(): Promise<Result<GmailData>> {
  const tokenResult = await getGoogleAccessToken()
  if (!tokenResult.ok) return tokenResult

  const token = tokenResult.data
  const headers = { Authorization: `Bearer ${token}` }

  // Get unread messages
  const query = encodeURIComponent('is:unread')
  const listResult = await fetchJson<MessageListResponse>(
    `${GMAIL_API}/messages?q=${query}&maxResults=20`,
    { headers }
  )

  if (!listResult.ok) return listResult

  const messages = listResult.data.messages ?? []
  const unread: GmailMessage[] = []

  const yesterday = Date.now() - 24 * 60 * 60 * 1000

  // Fetch details for each message
  for (const { id } of messages) {
    const msgResult = await fetchJson<MessageResponse>(
      `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers }
    )

    if (!msgResult.ok) continue

    const msg = msgResult.data
    const getHeader = (name: string) =>
      msg.payload.headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''

    const dateStr = getHeader('Date')
    const dateMs = dateStr ? new Date(dateStr).getTime() : 0

    unread.push({
      id: msg.id,
      threadId: msg.threadId,
      from: getHeader('From'),
      subject: getHeader('Subject'),
      snippet: msg.snippet,
      date: dateStr,
      isRecent: dateMs > yesterday,
    })
  }

  return ok({ unread })
}

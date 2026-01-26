#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { getGoogleAccessToken, type Account } from '../src/lib/google-auth.js'
import { fetchJson, type Result } from '../src/lib/api.js'
import { relativeTime } from '../src/lib/time.js'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

const { values } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    personal: { type: 'boolean', short: 'p' },
    query: { type: 'string', short: 'q', default: 'is:unread' },
    limit: { type: 'string', short: 'l', default: '20' },
    offset: { type: 'string', short: 'o', default: '0' },
    cursor: { type: 'string', short: 'c' },
    json: { type: 'boolean', short: 'j' },
    ids: { type: 'boolean' },
    inbox: { type: 'boolean', short: 'i', default: true },
    'no-inbox': { type: 'boolean' },
  },
})

const account: Account = values.personal ? 'personal' : 'work'

interface MessageListResponse {
  messages?: { id: string }[]
  nextPageToken?: string
  resultSizeEstimate?: number
}

interface MessageResponse {
  id: string
  snippet: string
  labelIds: string[]
  payload: {
    headers: { name: string; value: string }[]
  }
}

interface GmailMessage {
  id: string
  from: string
  subject: string
  snippet: string
  date: string
  labels: string[]
}

function printHelp() {
  console.log(`Usage: gmail-list [options]

Options:
  -p, --personal         Use personal account (default: work)
  -q, --query <query>    Gmail search query (default: is:unread)
  -l, --limit <n>        Results per page (default: 20)
  -o, --offset <n>       Skip first N results (default: 0)
  -c, --cursor <token>   Page token for cursor pagination
  -j, --json             Output as JSON (includes nextCursor)
      --ids              Output only message IDs (one per line, for piping)
  -i, --inbox            Only inbox emails (default: true)
      --no-inbox         Include all labels (sent, trash, etc)

Examples:
  gmail-list                         # List unread inbox emails
  gmail-list --no-inbox              # List unread from all labels
  gmail-list -q "from:boss"          # Emails from boss in inbox
  gmail-list -l 10                   # First 10 results
  gmail-list -l 10 -o 10             # Results 11-20
  gmail-list -c <token>              # Next page via cursor
  gmail-list --json | jq .nextCursor # Get cursor for next page
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
  const inboxOnly = values.inbox && !values['no-inbox']
  const baseQuery = values.query ?? 'is:unread'
  const fullQuery = inboxOnly ? `in:inbox ${baseQuery}` : baseQuery
  const limit = parseInt(values.limit ?? '20', 10)
  const offset = parseInt(values.offset ?? '0', 10)
  const cursor = values.cursor

  // For offset, we need to fetch offset + limit and skip first offset
  const fetchCount = offset + limit
  let allMessageIds: { id: string }[] = []
  let pageToken: string | undefined = cursor
  let nextPageToken: string | undefined

  // Fetch enough messages to satisfy offset + limit
  while (allMessageIds.length < fetchCount) {
    const url = new URL(`${GMAIL_API}/messages`)
    url.searchParams.set('q', fullQuery)
    url.searchParams.set('maxResults', String(Math.min(100, fetchCount - allMessageIds.length)))
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const listResult = await fetchJson<MessageListResponse>(url.toString(), { headers })

    if (!listResult.ok) {
      console.error(listResult.error)
      process.exit(1)
    }

    const messages = listResult.data.messages ?? []
    allMessageIds = allMessageIds.concat(messages)
    nextPageToken = listResult.data.nextPageToken

    if (!nextPageToken || messages.length === 0) break
    pageToken = nextPageToken
  }

  // Apply offset and limit
  const targetIds = allMessageIds.slice(offset, offset + limit)
  const results: GmailMessage[] = []

  for (const { id } of targetIds) {
    const msgResult = await fetchJson<MessageResponse>(
      `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers }
    )

    if (!msgResult.ok) continue

    const msg = msgResult.data
    const getHeader = (name: string) =>
      msg.payload.headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''

    results.push({
      id: msg.id,
      from: getHeader('From'),
      subject: getHeader('Subject'),
      snippet: msg.snippet,
      date: getHeader('Date'),
      labels: msg.labelIds ?? [],
    })
  }

  if (values.ids) {
    for (const msg of results) {
      console.log(msg.id)
    }
    return
  }

  if (values.json) {
    console.log(JSON.stringify({
      messages: results,
      nextCursor: nextPageToken ?? null,
      hasMore: !!nextPageToken || allMessageIds.length > offset + limit,
    }, null, 2))
  } else {
    if (results.length === 0) {
      console.log('No messages found')
      return
    }
    for (const msg of results) {
      const when = msg.date ? relativeTime(msg.date) : ''
      console.log(`[${msg.id}] ${when}`)
      console.log(`  From: ${msg.from}`)
      console.log(`  Subject: ${msg.subject}`)
      console.log(`  ${msg.snippet.slice(0, 100)}...`)
      console.log()
    }
    if (nextPageToken) {
      console.log(`Next page: --cursor ${nextPageToken}`)
    }
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

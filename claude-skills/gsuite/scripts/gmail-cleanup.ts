#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { getGoogleAccessToken } from '../src/lib/google-auth.js'
import { fetchJson } from '../src/lib/api.js'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

const { values } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    'dry-run': { type: 'boolean', short: 'n' },
    limit: { type: 'string', short: 'l', default: '50' },
  },
})

// Email cleanup rules - emails matching these get archived
const CLEANUP_RULES = [
  {
    name: 'Docusign via Vessel',
    query: 'from:(developers@vessel.co OR onboarding@vessel.co) Docusign',
  },
  {
    name: 'Vessel transactional',
    query: 'from:noreply@mail.vessel.co',
  },
  {
    name: 'BNC notifications',
    query: 'from:sbie@bnc.ca',
  },
]

interface MessageListResponse {
  messages?: { id: string }[]
  nextPageToken?: string
}

interface MessageResponse {
  id: string
  snippet: string
  payload: { headers: { name: string; value: string }[] }
}

function printHelp() {
  console.log(`Usage: gmail-cleanup [options]

Archives emails matching predefined noise rules.

Options:
  -n, --dry-run    Show what would be archived without doing it
  -l, --limit <n>  Max emails to process per rule (default: 50)
  -h, --help       Show this help

Rules:
${CLEANUP_RULES.map(r => `  - ${r.name}: ${r.query}`).join('\n')}
`)
}

async function archiveMessages(token: string, ids: string[]) {
  const res = await fetch(`${GMAIL_API}/messages/batchModify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ids,
      removeLabelIds: ['INBOX'],
    }),
  })

  if (!res.ok) {
    throw new Error(`Batch modify failed: ${res.status} ${await res.text()}`)
  }
}

async function main() {
  if (values.help) {
    printHelp()
    process.exit(0)
  }

  const tokenResult = await getGoogleAccessToken()
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }

  const token = tokenResult.data
  const headers = { Authorization: `Bearer ${token}` }
  const limit = parseInt(values.limit ?? '50', 10)
  const dryRun = values['dry-run']

  let totalArchived = 0

  for (const rule of CLEANUP_RULES) {
    // Only match unread inbox emails
    const fullQuery = `in:inbox ${rule.query}`
    const url = new URL(`${GMAIL_API}/messages`)
    url.searchParams.set('q', fullQuery)
    url.searchParams.set('maxResults', String(limit))

    const listResult = await fetchJson<MessageListResponse>(url.toString(), { headers })
    if (!listResult.ok) {
      console.error(`Error fetching for "${rule.name}": ${listResult.error}`)
      continue
    }

    const messages = listResult.data.messages ?? []
    if (messages.length === 0) {
      console.log(`${rule.name}: 0 emails`)
      continue
    }

    const ids = messages.map(m => m.id)

    if (dryRun) {
      console.log(`${rule.name}: ${ids.length} emails (dry-run)`)
      // Show first few subjects
      for (const id of ids.slice(0, 3)) {
        const msg = await fetchJson<MessageResponse>(
          `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=Subject`,
          { headers }
        )
        if (msg.ok) {
          const subj = msg.data.payload.headers.find(h => h.name === 'Subject')?.value
          console.log(`  - ${subj?.slice(0, 60)}...`)
        }
      }
      if (ids.length > 3) console.log(`  ... and ${ids.length - 3} more`)
    } else {
      await archiveMessages(token, ids)
      console.log(`${rule.name}: archived ${ids.length} emails`)
      totalArchived += ids.length
    }
  }

  if (!dryRun) {
    console.log(`\nTotal archived: ${totalArchived}`)
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { createInterface } from 'readline'
import { getGoogleAccessToken, type Account } from '../src/lib/google-auth.js'

async function readStdin(): Promise<string[]> {
  if (process.stdin.isTTY) return []
  const rl = createInterface({ input: process.stdin })
  const lines: string[] = []
  for await (const line of rl) {
    const trimmed = line.trim()
    if (trimmed) lines.push(trimmed)
  }
  return lines
}

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    personal: { type: 'boolean', short: 'p' },
    open: { type: 'boolean', short: 'o' },
  },
})

const account: Account = values.personal ? 'personal' : 'work'

function printHelp() {
  console.log(`Usage: gmail-unsubscribe [message-id...]

Extracts unsubscribe link from email's List-Unsubscribe header.
Reads message IDs from arguments or stdin (one per line).

Options:
  -p, --personal   Use personal account (default: work)
  -o, --open       Open the unsubscribe URL in browser

Examples:
  gmail-unsubscribe 18d4a5b2c3e4f5g6
  gmail-unsubscribe --open id1 id2 id3
  gmail-list --ids -q "category:promotions" | gmail-unsubscribe --open
`)
}

function extractUnsubscribeUrl(header: string): string | null {
  // List-Unsubscribe can contain: <url>, <mailto:...>, or both
  const matches = header.match(/<([^>]+)>/g)
  if (!matches) return null

  for (const match of matches) {
    const url = match.slice(1, -1) // remove < >
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
  }
  return null
}

async function processMessage(messageId: string, token: string, openUrl: boolean) {
  const res = await fetch(
    `${GMAIL_API}/messages/${messageId}?format=metadata&metadataHeaders=List-Unsubscribe&metadataHeaders=From&metadataHeaders=Subject`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) {
    console.error(`[${messageId}] Failed: ${res.status}`)
    return
  }

  const msg = await res.json() as {
    payload: { headers: { name: string; value: string }[] }
  }

  const getHeader = (name: string) =>
    msg.payload.headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''

  const from = getHeader('From')
  const subject = getHeader('Subject')
  const unsubHeader = getHeader('List-Unsubscribe')

  console.log(`[${messageId}] ${from}`)
  console.log(`  Subject: ${subject}`)

  if (!unsubHeader) {
    console.log(`  No unsubscribe header found\n`)
    return
  }

  const url = extractUnsubscribeUrl(unsubHeader)

  if (url) {
    console.log(`  Unsubscribe: ${url}`)

    if (openUrl) {
      const { exec } = await import('child_process')
      const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
      exec(`${cmd} "${url}"`)
      console.log(`  Opened in browser`)
    }
  } else {
    console.log(`  No HTTP unsubscribe URL (mailto: only)`)
  }
  console.log()
}

async function main() {
  if (values.help) {
    printHelp()
    process.exit(0)
  }

  const stdinIds = await readStdin()
  const messageIds = positionals.length > 0 ? positionals : stdinIds

  if (messageIds.length === 0) {
    printHelp()
    process.exit(1)
  }

  const tokenResult = await getGoogleAccessToken(account)
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }

  for (const messageId of messageIds) {
    await processMessage(messageId, tokenResult.data, !!values.open)
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

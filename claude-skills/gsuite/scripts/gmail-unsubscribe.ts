#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { getGoogleAccessToken } from '../src/lib/google-auth.js'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    open: { type: 'boolean', short: 'o' },
  },
})

function printHelp() {
  console.log(`Usage: gmail-unsubscribe <message-id>

Extracts unsubscribe link from email's List-Unsubscribe header.

Options:
  -o, --open    Open the unsubscribe URL in browser

Examples:
  gmail-unsubscribe 18d4a5b2c3e4f5g6
  gmail-unsubscribe --open 18d4a5b2c3e4f5g6
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

async function main() {
  if (values.help || positionals.length < 1) {
    printHelp()
    process.exit(values.help ? 0 : 1)
  }

  const [messageId] = positionals

  const tokenResult = await getGoogleAccessToken()
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }

  const res = await fetch(
    `${GMAIL_API}/messages/${messageId}?format=metadata&metadataHeaders=List-Unsubscribe&metadataHeaders=From&metadataHeaders=Subject`,
    { headers: { Authorization: `Bearer ${tokenResult.data}` } }
  )

  if (!res.ok) {
    console.error(`Failed: ${res.status} ${await res.text()}`)
    process.exit(1)
  }

  const msg = await res.json() as {
    payload: { headers: { name: string; value: string }[] }
  }

  const getHeader = (name: string) =>
    msg.payload.headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''

  const from = getHeader('From')
  const subject = getHeader('Subject')
  const unsubHeader = getHeader('List-Unsubscribe')

  if (!unsubHeader) {
    console.log(`No unsubscribe header found for email from: ${from}`)
    console.log(`Subject: ${subject}`)
    console.log('\nThis email may not support one-click unsubscribe.')
    process.exit(1)
  }

  const url = extractUnsubscribeUrl(unsubHeader)

  console.log(`From: ${from}`)
  console.log(`Subject: ${subject}`)
  console.log(`Raw header: ${unsubHeader}`)

  if (url) {
    console.log(`\nUnsubscribe URL: ${url}`)

    if (values.open) {
      const { exec } = await import('child_process')
      const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
      exec(`${cmd} "${url}"`)
      console.log('Opened in browser')
    }
  } else {
    console.log('\nNo HTTP unsubscribe URL found (may be mailto: only)')
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

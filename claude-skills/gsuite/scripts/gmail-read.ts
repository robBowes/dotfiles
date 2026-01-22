#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { getGoogleAccessToken } from '../src/lib/google-auth.js'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    json: { type: 'boolean', short: 'j' },
    html: { type: 'boolean' },
  },
})

function printHelp() {
  console.log(`Usage: gmail-read <message-id>

Options:
  --json    Output as JSON (includes headers + body)
  --html    Prefer HTML content over plain text

Examples:
  gmail-read 18d4a5b2c3e4f5g6
  gmail-read --json 18d4a5b2c3e4f5g6
`)
}

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64').toString('utf-8')
}

interface Part {
  mimeType: string
  filename?: string
  body?: { data?: string; attachmentId?: string; size?: number }
  parts?: Part[]
}

function findAttachments(parts: Part[] | undefined): { filename: string; mimeType: string; size: number }[] {
  const attachments: { filename: string; mimeType: string; size: number }[] = []
  if (!parts) return attachments
  for (const part of parts) {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size ?? 0,
      })
    }
    if (part.parts) {
      attachments.push(...findAttachments(part.parts))
    }
  }
  return attachments
}

function findBody(parts: Part[] | undefined, preferHtml: boolean): string {
  if (!parts) return ''

  const preferred = preferHtml ? 'text/html' : 'text/plain'
  const fallback = preferHtml ? 'text/plain' : 'text/html'

  for (const pref of [preferred, fallback]) {
    for (const part of parts) {
      if (part.mimeType === pref && part.body?.data) {
        return decodeBase64Url(part.body.data)
      }
      if (part.parts) {
        const nested = findBody(part.parts, preferHtml)
        if (nested) return nested
      }
    }
  }

  return ''
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

  const res = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${tokenResult.data}` },
  })

  if (!res.ok) {
    console.error(`Failed: ${res.status} ${await res.text()}`)
    process.exit(1)
  }

  const msg = await res.json() as {
    id: string
    snippet: string
    payload: {
      headers: { name: string; value: string }[]
      mimeType: string
      body?: { data?: string }
      parts?: Part[]
    }
  }

  const getHeader = (name: string) =>
    msg.payload.headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''

  // Extract body
  let body = ''
  if (msg.payload.body?.data) {
    body = decodeBase64Url(msg.payload.body.data)
  } else if (msg.payload.parts) {
    body = findBody(msg.payload.parts, values.html ?? false)
  }

  // Extract attachments
  const attachments = findAttachments(msg.payload.parts)

  if (values.json) {
    console.log(JSON.stringify({
      id: msg.id,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      listUnsubscribe: getHeader('List-Unsubscribe'),
      attachments,
      body,
    }, null, 2))
  } else {
    console.log(`From: ${getHeader('From')}`)
    console.log(`To: ${getHeader('To')}`)
    console.log(`Date: ${getHeader('Date')}`)
    console.log(`Subject: ${getHeader('Subject')}`)
    const unsub = getHeader('List-Unsubscribe')
    if (unsub) console.log(`Unsubscribe: ${unsub}`)
    if (attachments.length > 0) {
      console.log(`Attachments: ${attachments.map(a => `${a.filename} (${Math.round(a.size / 1024)}KB)`).join(', ')}`)
    }
    console.log('---')
    console.log(body)
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

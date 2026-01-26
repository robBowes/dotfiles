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
    to: { type: 'string', short: 't' },
  },
})

const account: Account = values.personal ? 'personal' : 'work'

function printHelp() {
  console.log(`Usage: gmail-forward <message-id> <to-email>
       gmail-forward --to <email> [message-id...]

Forwards email(s) to the specified address.
Reads message IDs from arguments or stdin (one per line).

Options:
  -p, --personal   Use personal account (default: work)
  -t, --to <email> Destination email (required for stdin mode)

Examples:
  gmail-forward 18d4a5b2c3e4f5g6 receipts@company.com
  gmail-forward --to receipts@company.com id1 id2 id3
  gmail-list --ids -q "from:receipts" | gmail-forward --to receipts@dext.cc
`)
}

function encodeBase64Url(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
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

interface Attachment {
  filename: string
  mimeType: string
  data: string // base64
}

function findBody(parts: Part[] | undefined, mimeType: string): string {
  if (!parts) return ''
  for (const part of parts) {
    if (part.mimeType === mimeType && part.body?.data) {
      return decodeBase64Url(part.body.data)
    }
    if (part.parts) {
      const nested = findBody(part.parts, mimeType)
      if (nested) return nested
    }
  }
  return ''
}

function findAttachmentParts(parts: Part[] | undefined): { filename: string; mimeType: string; attachmentId: string }[] {
  const attachments: { filename: string; mimeType: string; attachmentId: string }[] = []
  if (!parts) return attachments
  for (const part of parts) {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        attachmentId: part.body.attachmentId,
      })
    }
    if (part.parts) {
      attachments.push(...findAttachmentParts(part.parts))
    }
  }
  return attachments
}

async function fetchAttachment(messageId: string, attachmentId: string, token: string): Promise<string | null> {
  const res = await fetch(`${GMAIL_API}/messages/${messageId}/attachments/${attachmentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    console.error(`Failed to fetch attachment: ${res.status}`)
    return null
  }
  const data = await res.json() as { data: string }
  // Gmail returns base64url, convert to standard base64 and wrap at 76 chars for MIME
  const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/')
  return base64.match(/.{1,76}/g)?.join('\r\n') ?? base64
}

async function forwardMessage(messageId: string, toEmail: string, token: string, fromEmail: string) {
  // Get original message
  const msgRes = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!msgRes.ok) {
    console.error(`Failed to get message ${messageId}: ${msgRes.status}`)
    return false
  }

  const msg = await msgRes.json() as {
    id: string
    threadId: string
    payload: {
      headers: { name: string; value: string }[]
      mimeType: string
      body?: { data?: string }
      parts?: Part[]
    }
  }

  const getHeader = (name: string) =>
    msg.payload.headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''

  const originalFrom = getHeader('From')
  const originalSubject = getHeader('Subject')
  const originalDate = getHeader('Date')
  const originalTo = getHeader('To')

  // Extract body
  let textBody = ''
  let htmlBody = ''
  if (msg.payload.body?.data) {
    textBody = decodeBase64Url(msg.payload.body.data)
  } else if (msg.payload.parts) {
    textBody = findBody(msg.payload.parts, 'text/plain')
    htmlBody = findBody(msg.payload.parts, 'text/html')
  }

  // Extract attachments
  const attachmentParts = findAttachmentParts(msg.payload.parts)
  const attachments: Attachment[] = []
  for (const att of attachmentParts) {
    const data = await fetchAttachment(messageId, att.attachmentId, token)
    if (data) {
      attachments.push({ filename: att.filename, mimeType: att.mimeType, data })
    }
  }

  // Build forwarded message
  const fwdSubject = originalSubject.startsWith('Fwd:') ? originalSubject : `Fwd: ${originalSubject}`
  const fwdHeader = `
---------- Forwarded message ---------
From: ${originalFrom}
Date: ${originalDate}
Subject: ${originalSubject}
To: ${originalTo}
`

  const boundary = `boundary_${Date.now()}_${messageId}`
  const altBoundary = `alt_${Date.now()}_${messageId}`
  let rawMessage: string

  if (attachments.length > 0) {
    const parts: string[] = [
      `From: ${fromEmail}`,
      `To: ${toEmail}`,
      `Subject: ${fwdSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
    ]

    if (htmlBody) {
      parts.push(
        `--${boundary}`,
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        ``,
        `--${altBoundary}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        ``,
        fwdHeader,
        textBody || '(no text content)',
        ``,
        `--${altBoundary}`,
        `Content-Type: text/html; charset="UTF-8"`,
        ``,
        `<div>${fwdHeader.replace(/\n/g, '<br>')}</div><hr>${htmlBody}`,
        ``,
        `--${altBoundary}--`,
        ``
      )
    } else {
      parts.push(
        `--${boundary}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        ``,
        fwdHeader,
        textBody,
        ``
      )
    }

    for (const att of attachments) {
      parts.push(
        `--${boundary}`,
        `Content-Type: ${att.mimeType}`,
        `Content-Disposition: attachment; filename="${att.filename}"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        att.data,
        ``
      )
    }

    parts.push(`--${boundary}--`)
    rawMessage = parts.join('\r\n')
  } else if (htmlBody) {
    rawMessage = [
      `From: ${fromEmail}`,
      `To: ${toEmail}`,
      `Subject: ${fwdSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      fwdHeader,
      textBody || '(no text content)',
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      `<div>${fwdHeader.replace(/\n/g, '<br>')}</div><hr>${htmlBody}`,
      ``,
      `--${boundary}--`,
    ].join('\r\n')
  } else {
    rawMessage = [
      `From: ${fromEmail}`,
      `To: ${toEmail}`,
      `Subject: ${fwdSubject}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      fwdHeader,
      textBody,
    ].join('\r\n')
  }

  const sendRes = await fetch(`${GMAIL_API}/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodeBase64Url(rawMessage),
    }),
  })

  if (!sendRes.ok) {
    console.error(`Failed to forward ${messageId}: ${sendRes.status}`)
    return false
  }

  const sent = await sendRes.json() as { id: string }
  console.log(`Forwarded ${messageId} to ${toEmail} (sent: ${sent.id})`)
  return true
}

async function main() {
  if (values.help) {
    printHelp()
    process.exit(0)
  }

  // Determine toEmail and messageIds
  let toEmail: string
  let messageIds: string[]

  if (values.to) {
    // --to mode: IDs from args or stdin
    toEmail = values.to
    const stdinIds = await readStdin()
    messageIds = positionals.length > 0 ? positionals : stdinIds
  } else if (positionals.length >= 2) {
    // Legacy: gmail-forward <id> <email>
    messageIds = [positionals[0]]
    toEmail = positionals[1]
  } else {
    printHelp()
    process.exit(1)
  }

  if (!toEmail || messageIds.length === 0) {
    printHelp()
    process.exit(1)
  }

  const tokenResult = await getGoogleAccessToken(account)
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }
  const token = tokenResult.data

  // Get my email for From header
  const profileRes = await fetch(`${GMAIL_API}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!profileRes.ok) {
    console.error(`Failed to get profile: ${profileRes.status}`)
    process.exit(1)
  }
  const profile = await profileRes.json() as { emailAddress: string }

  for (const messageId of messageIds) {
    await forwardMessage(messageId, toEmail, token, profile.emailAddress)
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

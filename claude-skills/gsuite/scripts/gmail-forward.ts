#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { getGoogleAccessToken } from '../src/lib/google-auth.js'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
  },
})

function printHelp() {
  console.log(`Usage: gmail-forward <message-id> <to-email>

Forwards an email to the specified address.

Examples:
  gmail-forward 18d4a5b2c3e4f5g6 receipts@company.com
  gmail-forward 19be2305218af0b2 robert.vessel@dext.cc
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

async function main() {
  if (values.help || positionals.length < 2) {
    printHelp()
    process.exit(values.help ? 0 : 1)
  }

  const [messageId, toEmail] = positionals

  const tokenResult = await getGoogleAccessToken()
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }
  const token = tokenResult.data

  // Get original message
  const msgRes = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!msgRes.ok) {
    console.error(`Failed to get message: ${msgRes.status} ${await msgRes.text()}`)
    process.exit(1)
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
  if (attachments.length > 0) {
    console.log(`Found ${attachments.length} attachment(s)`)
  }

  // Get my email for From header
  const profileRes = await fetch(`${GMAIL_API}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!profileRes.ok) {
    console.error(`Failed to get profile: ${profileRes.status}`)
    process.exit(1)
  }
  const profile = await profileRes.json() as { emailAddress: string }

  // Build forwarded message
  const fwdSubject = originalSubject.startsWith('Fwd:') ? originalSubject : `Fwd: ${originalSubject}`

  const fwdHeader = `
---------- Forwarded message ---------
From: ${originalFrom}
Date: ${originalDate}
Subject: ${originalSubject}
To: ${originalTo}
`

  const boundary = `boundary_${Date.now()}`
  const altBoundary = `alt_${Date.now()}`
  let rawMessage: string

  if (attachments.length > 0) {
    // Multipart/mixed with body + attachments
    const parts: string[] = [
      `From: ${profile.emailAddress}`,
      `To: ${toEmail}`,
      `Subject: ${fwdSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
    ]

    // Add body part (as multipart/alternative if html exists)
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

    // Add attachments
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
    // Multipart with both text and html (no attachments)
    rawMessage = [
      `From: ${profile.emailAddress}`,
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
    // Plain text only
    rawMessage = [
      `From: ${profile.emailAddress}`,
      `To: ${toEmail}`,
      `Subject: ${fwdSubject}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      fwdHeader,
      textBody,
    ].join('\r\n')
  }

  // Send the message
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
    console.error(`Failed to send: ${sendRes.status} ${await sendRes.text()}`)
    process.exit(1)
  }

  const sent = await sendRes.json() as { id: string }
  console.log(`Forwarded ${messageId} to ${toEmail} (sent message: ${sent.id})`)
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

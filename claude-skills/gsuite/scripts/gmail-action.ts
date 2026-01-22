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
  console.log(`Usage: gmail-action <action> <message-id> [message-id2] [message-id3] ...

Actions:
  archive    Remove from inbox (keeps in All Mail)
  read       Mark as read
  unread     Mark as unread
  trash      Move to trash
  star       Add star
  unstar     Remove star

Examples:
  gmail-action archive 18d4a5b2c3e4f5g6
  gmail-action archive 18d4a5b2c3e4f5g6 18d4a5b2c3e4f5g7 18d4a5b2c3e4f5g8
  gmail-action read 18d4a5b2c3e4f5g6 18d4a5b2c3e4f5g7
`)
}

async function modifyMessage(id: string, addLabels: string[], removeLabels: string[]) {
  const tokenResult = await getGoogleAccessToken()
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }

  const res = await fetch(`${GMAIL_API}/messages/${id}/modify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenResult.data}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ addLabelIds: addLabels, removeLabelIds: removeLabels }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`Failed: ${res.status} ${err}`)
    process.exit(1)
  }

  return res.json()
}

async function trashMessage(id: string) {
  const tokenResult = await getGoogleAccessToken()
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }

  const res = await fetch(`${GMAIL_API}/messages/${id}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenResult.data}` },
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`Failed: ${res.status} ${err}`)
    process.exit(1)
  }

  return res.json()
}

async function main() {
  if (values.help || positionals.length < 2) {
    printHelp()
    process.exit(values.help ? 0 : 1)
  }

  const [action, ...messageIds] = positionals

  for (const messageId of messageIds) {
    try {
      switch (action) {
        case 'archive':
          await modifyMessage(messageId, [], ['INBOX'])
          console.log(`Archived ${messageId}`)
          break

        case 'read':
          await modifyMessage(messageId, [], ['UNREAD'])
          console.log(`Marked ${messageId} as read`)
          break

        case 'unread':
          await modifyMessage(messageId, ['UNREAD'], [])
          console.log(`Marked ${messageId} as unread`)
          break

        case 'trash':
          await trashMessage(messageId)
          console.log(`Trashed ${messageId}`)
          break

        case 'star':
          await modifyMessage(messageId, ['STARRED'], [])
          console.log(`Starred ${messageId}`)
          break

        case 'unstar':
          await modifyMessage(messageId, [], ['STARRED'])
          console.log(`Unstarred ${messageId}`)
          break

        default:
          console.error(`Unknown action: ${action}`)
          printHelp()
          process.exit(1)
      }
    } catch (err) {
      console.error(`Error processing ${messageId}:`, err instanceof Error ? err.message : err)
    }
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

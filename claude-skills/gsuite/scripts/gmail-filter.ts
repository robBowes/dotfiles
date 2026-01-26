#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { getGoogleAccessToken, type Account } from '../src/lib/google-auth.js'
import { fetchJson } from '../src/lib/api.js'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    personal: { type: 'boolean', short: 'p' },
    from: { type: 'string', short: 'f' },
    to: { type: 'string', short: 't' },
    subject: { type: 'string', short: 's' },
    query: { type: 'string', short: 'q' },
    label: { type: 'string', short: 'l' },
    'use-existing': { type: 'boolean' },
    'skip-inbox': { type: 'boolean', default: true },
    'no-skip-inbox': { type: 'boolean' },
    'mark-read': { type: 'boolean' },
    star: { type: 'boolean' },
    trash: { type: 'boolean' },
    json: { type: 'boolean', short: 'j' },
  },
})

const account: Account = values.personal ? 'personal' : 'work'

interface Label {
  id: string
  name: string
  type: string
}

interface Filter {
  id: string
  criteria: {
    from?: string
    to?: string
    subject?: string
    query?: string
    hasAttachment?: boolean
  }
  action: {
    addLabelIds?: string[]
    removeLabelIds?: string[]
    forward?: string
  }
}

function printHelp() {
  console.log(`Usage: gmail-filter <command> [options]

Commands:
  list                     List all filters
  create                   Create a new filter
  delete <filter-id>       Delete a filter

Create options (at least one criteria required):
  -f, --from <email>       Match sender
  -t, --to <email>         Match recipient
  -s, --subject <text>     Match subject contains
  -q, --query <query>      Gmail search query

Actions:
  -l, --label <name>       Add label (created if doesn't exist)
  --use-existing           Use existing label without creating
  --skip-inbox             Remove from inbox (default: true)
  --no-skip-inbox          Keep in inbox
  --mark-read              Mark as read
  --star                   Add star
  --trash                  Move to trash

Other:
  -p, --personal           Use personal account (default: work)
  -j, --json               Output as JSON
  -h, --help               Show help

Examples:
  gmail-filter list
  gmail-filter create --from "noreply@example.com" --skip-inbox --label "Auto/Noise"
  gmail-filter create --from "developers@vessel.co" --label "auto-vessel" --use-existing
  gmail-filter create --query "from:alerts subject:warning" --skip-inbox
  gmail-filter delete ABC123
`)
}

async function getLabels(token: string): Promise<Label[]> {
  const res = await fetchJson<{ labels: Label[] }>(`${GMAIL_API}/labels`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(res.error)
  return res.data.labels
}

async function getOrCreateLabel(token: string, name: string, useExisting: boolean = false): Promise<string> {
  const labels = await getLabels(token)
  const existing = labels.find(l => l.name.toLowerCase() === name.toLowerCase())
  if (existing) {
    console.log(`Using existing label: ${name}`)
    return existing.id
  }

  if (useExisting) {
    throw new Error(`Label "${name}" not found. Use without --use-existing to create it, or check the exact label name.`)
  }

  // Create label
  const res = await fetch(`${GMAIL_API}/labels`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    }),
  })

  if (!res.ok) {
    throw new Error(`Failed to create label: ${res.status} ${await res.text()}`)
  }

  const label = await res.json() as Label
  console.log(`Created label: ${name}`)
  return label.id
}

async function listFilters(token: string) {
  const res = await fetch(`${GMAIL_API}/settings/filters`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`Failed to list filters: ${res.status} ${await res.text()}`)
  }
  const text = await res.text()
  if (!text || text.trim() === '') return []
  const data = JSON.parse(text) as { filter?: Filter[] }
  return data.filter ?? []
}

async function createFilter(token: string, criteria: Filter['criteria'], action: Filter['action']) {
  const res = await fetch(`${GMAIL_API}/settings/filters`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ criteria, action }),
  })

  if (!res.ok) {
    throw new Error(`Failed to create filter: ${res.status} ${await res.text()}`)
  }

  return res.json() as Promise<Filter>
}

async function deleteFilter(token: string, filterId: string) {
  const res = await fetch(`${GMAIL_API}/settings/filters/${filterId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    throw new Error(`Failed to delete filter: ${res.status} ${await res.text()}`)
  }
}

async function main() {
  if (values.help || positionals.length === 0) {
    printHelp()
    process.exit(values.help ? 0 : 1)
  }

  const tokenResult = await getGoogleAccessToken(account)
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }
  const token = tokenResult.data

  const [command, ...args] = positionals

  switch (command) {
    case 'list': {
      const filters = await listFilters(token)
      const labels = await getLabels(token)
      const labelMap = new Map(labels.map(l => [l.id, l.name]))

      if (values.json) {
        console.log(JSON.stringify(filters, null, 2))
      } else if (filters.length === 0) {
        console.log('No filters configured')
      } else {
        for (const f of filters) {
          console.log(`[${f.id}]`)
          if (f.criteria.from) console.log(`  From: ${f.criteria.from}`)
          if (f.criteria.to) console.log(`  To: ${f.criteria.to}`)
          if (f.criteria.subject) console.log(`  Subject: ${f.criteria.subject}`)
          if (f.criteria.query) console.log(`  Query: ${f.criteria.query}`)

          const actions: string[] = []
          if (f.action.removeLabelIds?.includes('INBOX')) actions.push('skip inbox')
          if (f.action.removeLabelIds?.includes('UNREAD')) actions.push('mark read')
          if (f.action.addLabelIds?.includes('STARRED')) actions.push('star')
          if (f.action.addLabelIds?.includes('TRASH')) actions.push('trash')
          const addLabels = f.action.addLabelIds
            ?.filter(id => !['STARRED', 'TRASH'].includes(id))
            .map(id => labelMap.get(id) ?? id)
          if (addLabels?.length) actions.push(`label: ${addLabels.join(', ')}`)

          console.log(`  Actions: ${actions.join(', ')}`)
          console.log()
        }
      }
      break
    }

    case 'create': {
      const criteria: Filter['criteria'] = {}
      if (values.from) criteria.from = values.from
      if (values.to) criteria.to = values.to
      if (values.subject) criteria.subject = values.subject
      if (values.query) criteria.query = values.query

      if (Object.keys(criteria).length === 0) {
        console.error('At least one criteria required (--from, --to, --subject, or --query)')
        process.exit(1)
      }

      const action: Filter['action'] = {
        addLabelIds: [],
        removeLabelIds: [],
      }

      const skipInbox = values['skip-inbox'] && !values['no-skip-inbox']
      if (skipInbox) action.removeLabelIds!.push('INBOX')
      if (values['mark-read']) action.removeLabelIds!.push('UNREAD')
      if (values.star) action.addLabelIds!.push('STARRED')
      if (values.trash) action.addLabelIds!.push('TRASH')

      if (values.label) {
        const labelId = await getOrCreateLabel(token, values.label, values['use-existing'])
        action.addLabelIds!.push(labelId)
      }

      if (action.addLabelIds!.length === 0 && action.removeLabelIds!.length === 0) {
        console.error('At least one action required (--label, --skip-inbox, --mark-read, --star, or --trash)')
        process.exit(1)
      }

      const filter = await createFilter(token, criteria, action)
      console.log(`Created filter: ${filter.id}`)

      const summary: string[] = []
      if (criteria.from) summary.push(`from:${criteria.from}`)
      if (criteria.to) summary.push(`to:${criteria.to}`)
      if (criteria.subject) summary.push(`subject:${criteria.subject}`)
      if (criteria.query) summary.push(`query:${criteria.query}`)
      console.log(`  Criteria: ${summary.join(', ')}`)

      const actionSummary: string[] = []
      if (skipInbox) actionSummary.push('skip inbox')
      if (values['mark-read']) actionSummary.push('mark read')
      if (values.star) actionSummary.push('star')
      if (values.trash) actionSummary.push('trash')
      if (values.label) actionSummary.push(`label: ${values.label}`)
      console.log(`  Actions: ${actionSummary.join(', ')}`)
      break
    }

    case 'delete': {
      const filterId = args[0]
      if (!filterId) {
        console.error('Filter ID required')
        process.exit(1)
      }
      await deleteFilter(token, filterId)
      console.log(`Deleted filter: ${filterId}`)
      break
    }

    default:
      console.error(`Unknown command: ${command}`)
      printHelp()
      process.exit(1)
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

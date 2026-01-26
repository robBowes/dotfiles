#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { getGoogleAccessToken, type Account } from '../src/lib/google-auth.js'

const TASKS_API = 'https://tasks.googleapis.com/tasks/v1'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    personal: { type: 'boolean', short: 'p' },
    list: { type: 'string', short: 'l' },
    uncomplete: { type: 'boolean', short: 'u' },
  },
})

const account: Account = values.personal ? 'personal' : 'work'

function printHelp() {
  console.log(`Usage: tasks-complete <task-id> --list <list-id>

Mark a task as completed (or uncompleted).

Options:
  -p, --personal      Use personal account (default: work)
  -l, --list <id>     Task list ID (required)
  -u, --uncomplete    Mark as not completed instead

Examples:
  tasks-complete abc123 -l def456
  tasks-complete abc123 -l def456 --uncomplete
`)
}

async function main() {
  if (values.help || positionals.length < 1 || !values.list) {
    printHelp()
    process.exit(values.help ? 0 : 1)
  }

  const [taskId] = positionals
  const listId = values.list

  const tokenResult = await getGoogleAccessToken(account)
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }

  const status = values.uncomplete ? 'needsAction' : 'completed'

  const res = await fetch(`${TASKS_API}/lists/${listId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenResult.data}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  })

  if (!res.ok) {
    console.error(`Failed: ${res.status} ${await res.text()}`)
    process.exit(1)
  }

  const task = await res.json() as { id: string; title: string; status: string }

  if (values.uncomplete) {
    console.log(`Marked "${task.title}" as not completed`)
  } else {
    console.log(`Completed "${task.title}"`)
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

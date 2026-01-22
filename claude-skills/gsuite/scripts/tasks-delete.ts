#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { getGoogleAccessToken } from '../src/lib/google-auth.js'

const TASKS_API = 'https://tasks.googleapis.com/tasks/v1'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    list: { type: 'string', short: 'l' },
  },
})

function printHelp() {
  console.log(`Usage: tasks-delete <task-id> --list <list-id>

Delete a task permanently.

Options:
  -l, --list <id>     Task list ID (required)

Examples:
  tasks-delete abc123 -l def456
`)
}

async function main() {
  if (values.help || positionals.length < 1 || !values.list) {
    printHelp()
    process.exit(values.help ? 0 : 1)
  }

  const [taskId] = positionals
  const listId = values.list

  const tokenResult = await getGoogleAccessToken()
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }

  const res = await fetch(`${TASKS_API}/lists/${listId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenResult.data}` },
  })

  if (!res.ok) {
    console.error(`Failed: ${res.status} ${await res.text()}`)
    process.exit(1)
  }

  console.log(`Deleted task ${taskId}`)
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

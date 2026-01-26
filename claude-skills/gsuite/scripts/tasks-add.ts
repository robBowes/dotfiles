#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { getGoogleAccessToken, type Account } from '../src/lib/google-auth.js'
import { fetchJson } from '../src/lib/api.js'

const TASKS_API = 'https://tasks.googleapis.com/tasks/v1'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    personal: { type: 'boolean', short: 'p' },
    list: { type: 'string', short: 'l' },
    due: { type: 'string', short: 'd' },
    notes: { type: 'string', short: 'n' },
    json: { type: 'boolean', short: 'j' },
  },
})

const account: Account = values.personal ? 'personal' : 'work'

interface TaskListsResponse {
  items?: { id: string; title: string }[]
}

interface TaskResponse {
  id: string
  title: string
  due?: string
  notes?: string
  status: string
}

function printHelp() {
  console.log(`Usage: tasks-add <title> [options]

Options:
  -p, --personal      Use personal account (default: work)
  -l, --list <name>   Task list name (default: first list)
  -d, --due <date>    Due date (YYYY-MM-DD)
  -n, --notes <text>  Task notes
  -j, --json          Output as JSON

Examples:
  tasks-add "Buy groceries"
  tasks-add "Call mom" -d 2024-01-20
  tasks-add "Review doc" -l "Work" -n "Check section 3"
`)
}

async function main() {
  if (values.help || positionals.length < 1) {
    printHelp()
    process.exit(values.help ? 0 : 1)
  }

  const title = positionals.join(' ')

  const tokenResult = await getGoogleAccessToken(account)
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }

  const token = tokenResult.data
  const headers = { Authorization: `Bearer ${token}` }

  // Get task lists
  const listsResult = await fetchJson<TaskListsResponse>(`${TASKS_API}/users/@me/lists`, { headers })
  if (!listsResult.ok) {
    console.error(listsResult.error)
    process.exit(1)
  }

  const taskLists = listsResult.data.items ?? []
  if (taskLists.length === 0) {
    console.error('No task lists found')
    process.exit(1)
  }

  // Find target list
  let targetList = taskLists[0]
  if (values.list) {
    const filterName = values.list.toLowerCase()
    const found = taskLists.find(l => l.title.toLowerCase().includes(filterName))
    if (!found) {
      console.error(`No task list found matching: ${values.list}`)
      console.error('Available lists:', taskLists.map(l => l.title).join(', '))
      process.exit(1)
    }
    targetList = found
  }

  // Build task object
  const task: Record<string, string> = { title }
  if (values.due) {
    // Convert YYYY-MM-DD to RFC 3339 format
    task.due = `${values.due}T00:00:00.000Z`
  }
  if (values.notes) {
    task.notes = values.notes
  }

  // Create task
  const res = await fetch(`${TASKS_API}/lists/${targetList.id}/tasks`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  })

  if (!res.ok) {
    console.error(`Failed: ${res.status} ${await res.text()}`)
    process.exit(1)
  }

  const created = await res.json() as TaskResponse

  if (values.json) {
    console.log(JSON.stringify({ ...created, listName: targetList.title }, null, 2))
  } else {
    console.log(`Created task in "${targetList.title}":`)
    console.log(`  Title: ${created.title}`)
    console.log(`  ID: ${created.id}`)
    console.log(`  List ID: ${targetList.id}`)
    if (created.due) console.log(`  Due: ${created.due.split('T')[0]}`)
    if (created.notes) console.log(`  Notes: ${created.notes}`)
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

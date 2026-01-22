#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { getGoogleAccessToken } from '../src/lib/google-auth.js'
import { fetchJson } from '../src/lib/api.js'
import { relativeTime } from '../src/lib/time.js'

const TASKS_API = 'https://tasks.googleapis.com/tasks/v1'

const { values } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    list: { type: 'string', short: 'l' },
    all: { type: 'boolean', short: 'a' },
    json: { type: 'boolean', short: 'j' },
  },
})

interface TaskListsResponse {
  items?: { id: string; title: string }[]
}

interface TasksResponse {
  items?: {
    id: string
    title: string
    due?: string
    notes?: string
    status: string
    completed?: string
  }[]
}

interface Task {
  id: string
  title: string
  due?: string
  notes?: string
  status: string
  listId: string
  listName: string
}

function printHelp() {
  console.log(`Usage: tasks-list [options]

Options:
  -l, --list <name>   Filter by task list name
  -a, --all           Include completed tasks
  -j, --json          Output as JSON

Examples:
  tasks-list                  # List all pending tasks
  tasks-list -l "My Tasks"    # Tasks from specific list
  tasks-list --all            # Include completed
`)
}

async function main() {
  if (values.help) {
    printHelp()
    process.exit(0)
  }

  const tokenResult = await getGoogleAccessToken()
  if (!tokenResult.ok) {
    console.error(tokenResult.error)
    process.exit(1)
  }

  const token = tokenResult.data
  const headers = { Authorization: `Bearer ${token}` }

  // Get all task lists
  const listsResult = await fetchJson<TaskListsResponse>(`${TASKS_API}/users/@me/lists`, { headers })
  if (!listsResult.ok) {
    console.error(listsResult.error)
    process.exit(1)
  }

  let taskLists = listsResult.data.items ?? []

  // Filter by list name if specified
  if (values.list) {
    const filterName = values.list.toLowerCase()
    taskLists = taskLists.filter(l => l.title.toLowerCase().includes(filterName))
    if (taskLists.length === 0) {
      console.error(`No task list found matching: ${values.list}`)
      process.exit(1)
    }
  }

  const allTasks: Task[] = []
  const showCompleted = values.all ? 'true' : 'false'

  for (const list of taskLists) {
    const tasksResult = await fetchJson<TasksResponse>(
      `${TASKS_API}/lists/${list.id}/tasks?showCompleted=${showCompleted}&showHidden=true&maxResults=100`,
      { headers }
    )

    if (!tasksResult.ok) continue

    const tasks = tasksResult.data.items ?? []
    for (const task of tasks) {
      if (!values.all && task.status === 'completed') continue

      allTasks.push({
        id: task.id,
        title: task.title,
        due: task.due,
        notes: task.notes,
        status: task.status,
        listId: list.id,
        listName: list.title,
      })
    }
  }

  // Sort by due date
  allTasks.sort((a, b) => {
    if (!a.due) return 1
    if (!b.due) return -1
    return new Date(a.due).getTime() - new Date(b.due).getTime()
  })

  if (values.json) {
    console.log(JSON.stringify(allTasks, null, 2))
  } else {
    // Also output task lists for reference
    console.log('Task Lists:')
    for (const list of taskLists) {
      console.log(`  [${list.id}] ${list.title}`)
    }
    console.log()

    if (allTasks.length === 0) {
      console.log('No tasks found')
      return
    }

    console.log('Tasks:')
    for (const task of allTasks) {
      const status = task.status === 'completed' ? '[x]' : '[ ]'
      const due = task.due ? ` (due: ${relativeTime(task.due)})` : ''
      console.log(`${status} [${task.listName}] ${task.title}${due}`)
      console.log(`    id: ${task.id}, listId: ${task.listId}`)
      if (task.notes) console.log(`    notes: ${task.notes.slice(0, 50)}...`)
    }
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

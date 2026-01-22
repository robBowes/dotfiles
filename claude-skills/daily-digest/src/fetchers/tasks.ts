import { fetchJson, ok, type Result } from '../lib/api.js'
import { getGoogleAccessToken } from '../lib/google-auth.js'

export interface GoogleTask {
  id: string
  listId: string
  title: string
  due?: string
  notes?: string
  listName: string
}

export interface TasksData {
  tasks: GoogleTask[]
}

const TASKS_API = 'https://tasks.googleapis.com/tasks/v1'

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
  }[]
}

export async function fetchTasks(): Promise<Result<TasksData>> {
  const tokenResult = await getGoogleAccessToken()
  if (!tokenResult.ok) return tokenResult

  const token = tokenResult.data
  const headers = { Authorization: `Bearer ${token}` }

  // Get all task lists
  const listsResult = await fetchJson<TaskListsResponse>(`${TASKS_API}/users/@me/lists`, { headers })
  if (!listsResult.ok) return listsResult

  const taskLists = listsResult.data.items ?? []
  const allTasks: GoogleTask[] = []

  // Get tomorrow's date for filtering
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(23, 59, 59, 999)
  const dueMax = tomorrow.toISOString()

  for (const list of taskLists) {
    const tasksResult = await fetchJson<TasksResponse>(
      `${TASKS_API}/lists/${list.id}/tasks?showCompleted=false&dueMax=${encodeURIComponent(dueMax)}&maxResults=50`,
      { headers }
    )

    if (!tasksResult.ok) continue

    const tasks = tasksResult.data.items ?? []
    for (const task of tasks) {
      if (task.status === 'completed') continue

      allTasks.push({
        id: task.id,
        listId: list.id,
        title: task.title,
        due: task.due,
        notes: task.notes,
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

  return ok({ tasks: allTasks })
}

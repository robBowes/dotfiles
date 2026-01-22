import { fetchJson, ok, err, getEnv, type Result } from '../lib/api.js'

export interface NotionItem {
  id: string
  title: string
  url: string
  database: string
  status?: string
}

export interface NotionData {
  assignedItems: NotionItem[]
}

const NOTION_API = 'https://api.notion.com/v1'

interface SearchResponse {
  results: { id: string; title?: { plain_text: string }[] }[]
}

interface DatabaseQueryResponse {
  results: {
    id: string
    url: string
    properties: Record<string, unknown>
  }[]
}

function getTitle(props: Record<string, unknown>): string {
  // Try common title property names
  for (const key of ['Name', 'Title', 'title', 'Task', 'Item']) {
    const prop = props[key] as { title?: { plain_text: string }[] } | undefined
    if (prop?.title?.[0]?.plain_text) {
      return prop.title[0].plain_text
    }
  }
  return '(Untitled)'
}

function getStatus(props: Record<string, unknown>): string | undefined {
  const status = props['Status'] as { status?: { name: string } } | undefined
  return status?.status?.name
}

export async function fetchNotion(): Promise<Result<NotionData>> {
  const token = getEnv('NOTION_API_KEY')
  const userId = getEnv('NOTION_USER_ID')

  if (!token || !userId) {
    return err('Skipped: missing NOTION_API_KEY or NOTION_USER_ID')
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
  }

  // Find all databases
  const searchResult = await fetchJson<SearchResponse>(`${NOTION_API}/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filter: { property: 'object', value: 'database' },
      page_size: 100,
    }),
  })

  if (!searchResult.ok) return searchResult

  const completedStatuses = ['Done', 'Completed', 'done', 'completed']

  // Query all databases in parallel
  const dbQueries = searchResult.data.results.map(async (db) => {
    const dbName = db.title?.[0]?.plain_text ?? '(Untitled DB)'

    const queryResult = await fetchJson<DatabaseQueryResponse>(
      `${NOTION_API}/databases/${db.id}/query`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filter: {
            property: 'Assignee',
            people: { contains: userId },
          },
          page_size: 50,
        }),
      }
    )

    if (!queryResult.ok) return [] // Skip databases without Assignee property

    return queryResult.data.results
      .filter(item => {
        const status = getStatus(item.properties)
        return !status || !completedStatuses.includes(status)
      })
      .map(item => ({
        id: item.id,
        title: getTitle(item.properties),
        url: item.url,
        database: dbName,
        status: getStatus(item.properties),
      }))
  })

  const results = await Promise.all(dbQueries)
  const assignedItems = results.flat()

  return ok({ assignedItems })
}

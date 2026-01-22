// Shared Metabase API utilities

function getConfig() {
  const url = process.env.METABASE_URL?.replace(/\/$/, '')
  const key = process.env.METABASE_API_KEY

  if (!url || !key) {
    console.error('Missing required env vars: METABASE_URL, METABASE_API_KEY')
    process.exit(1)
  }

  return { url, key }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { url: baseUrl, key } = getConfig()
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': key
  }
  const url = `${baseUrl}${path}`
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} failed (${res.status}): ${text}`)
  }

  return res.json()
}

export const metabaseGet = <T>(path: string) => request<T>('GET', path)
export const metabasePost = <T>(path: string, body: unknown) => request<T>('POST', path, body)
export const metabasePut = <T>(path: string, body: unknown) => request<T>('PUT', path, body)
export const metabaseDelete = <T>(path: string) => request<T>('DELETE', path)

// Types

export interface Card {
  id: number
  name: string
  description: string | null
  collection_id: number | null
  database_id: number
  dataset_query: {
    type: 'native' | 'query'
    native?: { query: string; template_tags?: Record<string, unknown> }
    query?: Record<string, unknown>
    database: number
  }
  display: string
  visualization_settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Dashboard {
  id: number
  name: string
  description: string | null
  collection_id: number | null
  dashcards: DashCard[]
  parameters: unknown[]
  created_at: string
  updated_at: string
}

export interface DashCard {
  id: number
  card_id: number
  card: Card
  row: number
  col: number
  size_x: number
  size_y: number
}

export interface Database {
  id: number
  name: string
  engine: string
  details: Record<string, unknown>
  tables?: Table[]
}

export interface Table {
  id: number
  name: string
  schema: string | null
  db_id: number
  fields?: Field[]
}

export interface Field {
  id: number
  name: string
  display_name: string
  base_type: string
  semantic_type: string | null
  table_id: number
}

export interface Collection {
  id: number | 'root'
  name: string
  description: string | null
  location: string
  personal_owner_id: number | null
}

export interface CollectionItem {
  id: number
  name: string
  model: 'card' | 'dashboard' | 'collection'
  description: string | null
}

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  is_superuser: boolean
  last_login: string | null
}

import { fetchJson, getEnv, ok, err, type Result } from '../lib/api.js'

export interface SlackDM {
  userId: string
  userName: string
  messageCount: number
  preview: string
}

export interface SlackMention {
  channel: string
  from: string
  text: string
  ts: string
}

export interface SlackData {
  unreadDMs: SlackDM[]
  mentions: SlackMention[]
}

const SLACK_API = 'https://slack.com/api'

async function slackFetch<T>(endpoint: string, token: string, params: Record<string, string> = {}): Promise<Result<T>> {
  const url = new URL(`${SLACK_API}/${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const result = await fetchJson<{ ok: boolean; error?: string } & T>(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!result.ok) return result
  if (!result.data.ok) return err(result.data.error ?? 'Slack API error')
  return ok(result.data as T)
}

interface ConversationsListResponse {
  channels: { id: string; user?: string }[]
}

interface ConversationsInfoResponse {
  channel: { unread_count?: number }
}

interface ConversationsHistoryResponse {
  messages: { text: string; user?: string }[]
}

interface UsersInfoResponse {
  user: { real_name?: string; name: string }
}

interface SearchResponse {
  messages: {
    matches: { channel: { name: string }; username: string; text: string; ts: string }[]
  }
}

export async function fetchSlack(): Promise<Result<SlackData>> {
  const token = getEnv('SLACK_TOKEN')

  if (!token) {
    return err('Skipped: missing SLACK_TOKEN')
  }

  // Get DM channels
  const dmsResult = await slackFetch<ConversationsListResponse>('conversations.list', token, { types: 'im' })
  if (!dmsResult.ok) return dmsResult

  const unreadDMs: SlackDM[] = []

  for (const dm of dmsResult.data.channels) {
    const infoResult = await slackFetch<ConversationsInfoResponse>('conversations.info', token, { channel: dm.id })
    if (!infoResult.ok) continue

    const unreadCount = infoResult.data.channel.unread_count ?? 0
    if (unreadCount === 0) continue

    // Get latest message
    const historyResult = await slackFetch<ConversationsHistoryResponse>('conversations.history', token, {
      channel: dm.id,
      limit: '1',
    })

    // Get user name
    let userName = dm.user ?? 'Unknown'
    if (dm.user) {
      const userResult = await slackFetch<UsersInfoResponse>('users.info', token, { user: dm.user })
      if (userResult.ok) userName = userResult.data.user.real_name ?? userResult.data.user.name
    }

    unreadDMs.push({
      userId: dm.user ?? dm.id,
      userName,
      messageCount: unreadCount,
      preview: historyResult.ok ? (historyResult.data.messages[0]?.text ?? '').slice(0, 100) : '',
    })
  }

  // Get @mentions from last 24h
  const yesterday = Math.floor(Date.now() / 1000) - 86400
  const searchResult = await slackFetch<SearchResponse>('search.messages', token, {
    query: 'to:me',
    sort: 'timestamp',
    sort_dir: 'desc',
    count: '20',
  })

  const mentions: SlackMention[] = searchResult.ok
    ? searchResult.data.messages.matches
        .filter(m => parseFloat(m.ts) > yesterday)
        .map(m => ({
          channel: m.channel.name,
          from: m.username,
          text: m.text.slice(0, 100),
          ts: m.ts,
        }))
    : []

  return ok({ unreadDMs, mentions })
}

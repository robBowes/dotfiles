import { fetchJson, getEnv, err, type Result } from './api.js'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export type Account = 'work' | 'personal'

interface TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

const tokenCache: Record<Account, { token: string; expiresAt: number } | null> = {
  work: null,
  personal: null,
}

export async function getGoogleAccessToken(account: Account = 'work'): Promise<Result<string>> {
  // Return cached token if valid
  const cached = tokenCache[account]
  if (cached && Date.now() < cached.expiresAt - 60000) {
    return { ok: true, data: cached.token }
  }

  const prefix = account === 'work' ? 'GOOGLE_WORK' : 'GOOGLE_PERSONAL'
  const clientId = getEnv(`${prefix}_CLIENT_ID`)
  const clientSecret = getEnv(`${prefix}_CLIENT_SECRET`)
  const refreshToken = getEnv(`${prefix}_REFRESH_TOKEN`)

  if (!clientId || !clientSecret || !refreshToken) {
    return err(`Missing ${prefix}_CLIENT_ID, ${prefix}_CLIENT_SECRET, or ${prefix}_REFRESH_TOKEN (run pnpm auth${account === 'personal' ? ' -p' : ''})`)
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const result = await fetchJson<TokenResponse>(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!result.ok) return result

  tokenCache[account] = {
    token: result.data.access_token,
    expiresAt: Date.now() + result.data.expires_in * 1000,
  }

  return { ok: true, data: tokenCache[account]!.token }
}

// Full access scopes for gsuite skill
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar',
].join(' ')

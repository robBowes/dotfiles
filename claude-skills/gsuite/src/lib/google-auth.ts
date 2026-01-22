import { fetchJson, getEnv, err, type Result } from './api.js'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

interface TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

let cachedToken: { token: string; expiresAt: number } | null = null

export async function getGoogleAccessToken(): Promise<Result<string>> {
  // Return cached token if valid
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return { ok: true, data: cachedToken.token }
  }

  const clientId = getEnv('GOOGLE_CLIENT_ID')
  const clientSecret = getEnv('GOOGLE_CLIENT_SECRET')
  const refreshToken = getEnv('GOOGLE_REFRESH_TOKEN')

  if (!clientId || !clientSecret || !refreshToken) {
    return err('Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN (run pnpm setup)')
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

  cachedToken = {
    token: result.data.access_token,
    expiresAt: Date.now() + result.data.expires_in * 1000,
  }

  return { ok: true, data: cachedToken.token }
}

// Full access scopes for gsuite skill
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar',
].join(' ')

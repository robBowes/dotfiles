#!/usr/bin/env tsx
import { createServer } from 'http'
import { URL } from 'url'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { GOOGLE_SCOPES } from '../src/lib/google-auth.js'

const PORT = 8765
const REDIRECT_URI = `http://localhost:${PORT}/callback`

// Find pnpm workspace root (where pnpm-workspace.yaml lives)
function findWorkspaceRoot(): string {
  let dir = process.cwd()
  while (dir !== '/') {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return dir
    }
    dir = dirname(dir)
  }
  throw new Error('Could not find pnpm workspace root (pnpm-workspace.yaml)')
}

function getEnvPath(): string {
  const root = findWorkspaceRoot()
  return join(root, '.env.local')
}

function updateEnvFile(envPath: string, key: string, value: string): void {
  let content = ''
  if (existsSync(envPath)) {
    content = readFileSync(envPath, 'utf-8')
  }

  const lines = content.split('\n')
  const newLines: string[] = []
  let found = false

  for (const line of lines) {
    if (line.startsWith(`${key}=`)) {
      newLines.push(`${key}=${value}`)
      found = true
    } else {
      newLines.push(line)
    }
  }

  if (!found) {
    newLines.push(`${key}=${value}`)
  }

  // Remove empty lines at end, then add one trailing newline
  while (newLines.length > 0 && newLines[newLines.length - 1] === '') {
    newLines.pop()
  }
  newLines.push('')

  writeFileSync(envPath, newLines.join('\n'))
}

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.log('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET')
    console.log('1. Go to https://console.cloud.google.com/apis/credentials')
    console.log('2. Create OAuth 2.0 Client ID (Desktop app)')
    console.log('3. Add to .env.local:')
    console.log('   GOOGLE_CLIENT_ID=your_client_id')
    console.log('   GOOGLE_CLIENT_SECRET=your_secret')
    process.exit(1)
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', GOOGLE_SCOPES)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')

  console.log('Opening browser for Google OAuth...')
  console.log(`If it doesn't open, visit: ${authUrl.toString()}`)

  // Open browser
  const open = (await import('child_process')).exec
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  open(`${cmd} "${authUrl.toString()}"`)

  // Start server to receive callback
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code')

      if (!code) {
        res.writeHead(400)
        res.end('No code received')
        return
      }

      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
        }).toString(),
      })

      const tokens = await tokenRes.json() as { refresh_token?: string; error?: string }

      if (tokens.error || !tokens.refresh_token) {
        res.writeHead(400)
        res.end(`Error: ${tokens.error ?? 'No refresh token'}`)
        console.error('Failed to get refresh token:', tokens)
        server.close()
        process.exit(1)
      }

      // Save refresh token (update, don't append)
      const envPath = getEnvPath()
      updateEnvFile(envPath, 'GOOGLE_REFRESH_TOKEN', tokens.refresh_token)

      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('<h1>Success!</h1><p>Refresh token saved. You can close this window.</p>')

      console.log(`\nRefresh token saved to ${envPath}`)
      console.log('You can now run: pnpm digest')

      setTimeout(() => {
        server.close()
        process.exit(0)
      }, 1000)
    } else {
      res.writeHead(404)
      res.end('Not found')
    }
  })

  server.listen(PORT, () => {
    console.log(`Waiting for OAuth callback on http://localhost:${PORT}...`)
  })
}

main().catch(console.error)

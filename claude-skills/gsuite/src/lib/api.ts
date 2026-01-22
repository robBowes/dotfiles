export type Result<T> = { ok: true; data: T } | { ok: false; error: string }

export function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}

export function err<T>(error: string): Result<T> {
  return { ok: false, error }
}

export async function fetchJson<T>(
  url: string,
  options: RequestInit = {}
): Promise<Result<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!res.ok) {
      const text = await res.text()
      return err(`HTTP ${res.status}: ${text.slice(0, 200)}`)
    }

    const data = await res.json()
    return ok(data as T)
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e))
  }
}

export function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing env var: ${name}`)
  return val
}

export function getEnv(name: string): string | undefined {
  return process.env[name]
}

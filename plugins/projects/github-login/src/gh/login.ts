import { isRecord } from '@sand/kit'
import { gh } from './run'

const host = 'github.com'

const isActive = (entry: unknown): entry is Record<string, unknown> => isRecord(entry) && Boolean(entry.active) && entry.state === 'success'

const activeLogin = (entries: unknown) => {
  const active = Array.isArray(entries) ? entries.find(isActive) : undefined
  return typeof active?.login === 'string' ? active.login : undefined
}

const fromJson = (text: string) => {
  try {
    const parsed: unknown = JSON.parse(text)
    return isRecord(parsed) && isRecord(parsed.hosts) ? activeLogin(parsed.hosts[host]) : undefined
  } catch {
    return undefined
  }
}

const fromText = (text: string) => text.match(/Logged in to github\.com (?:account|as) ([\w-]+)/)?.[1]

export const ghLogin = async (): Promise<string | undefined> => {
  const json = await gh(['auth', 'status', '--hostname', host, '--json', 'hosts'])
  const login = fromJson(json.stdout)
  if (login || json.code === -1) return login
  const plain = await gh(['auth', 'status', '--hostname', host])
  return plain.code === 0 ? fromText(`${plain.stdout}\n${plain.stderr}`) : undefined
}

export const ghToken = async () => {
  const result = await gh(['auth', 'token', '--hostname', host])
  const token = result.stdout.trim()
  if (result.code !== 0 || !token) throw new Error(result.stderr.trim() || 'gh has no GitHub login on this PC')
  return token
}

export const loginOf = async (token: string) => {
  const response = await fetch('https://api.github.com/user', {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'sand' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`GitHub did not accept the token (HTTP ${response.status})`)
  const body: unknown = await response.json()
  const login = isRecord(body) && typeof body.login === 'string' ? body.login : undefined
  if (!login) throw new Error('GitHub did not say which account the token belongs to')
  return login
}

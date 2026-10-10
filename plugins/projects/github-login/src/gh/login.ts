import { gh } from './run'

const host = 'github.com'

interface HostEntry {
  state?: string
  active?: boolean
  login?: string
}

const fromJson = (text: string) => {
  try {
    const hosts = (JSON.parse(text) as { hosts?: Record<string, HostEntry[]> }).hosts?.[host] ?? []
    return hosts.find(entry => entry.active && entry.state === 'success')?.login
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
  const { login } = (await response.json()) as { login?: string }
  if (!login) throw new Error('GitHub did not say which account the token belongs to')
  return login
}

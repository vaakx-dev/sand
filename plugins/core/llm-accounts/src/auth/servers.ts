import type { ServerDraft, ServerProvider } from '../contract'
import { isFixed } from './kinds'
import type { ServerEntry } from './store'

const providers: ServerProvider[] = ['ollama', 'lmstudio', 'server']

const ports: Record<string, ServerProvider> = { '11434': 'ollama', '1234': 'lmstudio' }

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const baseId = (name: string, provider: ServerProvider) => {
  const made = slug(name) || 'server'
  return made.replace(/-/g, '') === provider ? provider : made
}

const uniqueId = (wanted: string, taken: (id: string) => boolean) => {
  if (!taken(wanted)) return wanted
  for (let count = 2; ; count++) if (!taken(`${wanted}-${count}`)) return `${wanted}-${count}`
}

const urlOf = (value: string) => {
  const trimmed = value.trim().replace(/\/+$/, '')
  try {
    const url = new URL(trimmed)
    if (url.protocol === 'http:' || url.protocol === 'https:') return { url: trimmed, port: url.port }
  } catch {}
  throw new Error('The server address must start with http:// or https://')
}

export const serverEntry = (draft: ServerDraft, servers: ServerEntry[]): ServerEntry => {
  const name = String(draft.name ?? '').trim()
  if (!name) throw new Error('Give the server a name')
  const { url, port } = urlOf(String(draft.url ?? ''))
  const before = draft.id ? servers.find(server => server.id === draft.id) : undefined
  if (draft.id && !before) throw new Error(`Unknown server "${draft.id}"`)
  const provider = providers.includes(draft.provider as ServerProvider) ? draft.provider! : (before?.provider ?? ports[port] ?? 'server')
  const id = before?.id ?? uniqueId(baseId(name, provider), id => isFixed(id) || servers.some(server => server.id === id))
  const key = draft.key === undefined ? before?.key : String(draft.key).trim()
  return { id, name, url, provider, ...(key && { key }), ...(before?.shared !== undefined && { shared: before.shared }) }
}

export const checkServer = async (server: ServerEntry) => {
  try {
    const response = await fetch(`${server.url}/models`, {
      headers: { accept: 'application/json', ...(server.key && { authorization: `Bearer ${server.key}` }) },
      signal: AbortSignal.timeout(5_000),
    })
    await response.body?.cancel()
    return response.ok ? undefined : `${server.name} answered HTTP ${response.status} at ${server.url}/models`
  } catch (error) {
    return `Couldn't reach ${server.name} at ${server.url}: ${error instanceof Error ? error.message : String(error)}`
  }
}

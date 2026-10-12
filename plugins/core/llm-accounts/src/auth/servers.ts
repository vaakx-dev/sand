import type { ServerDraft, ServerProvider } from '../contract'
import { bearer, errorMessage, trimSlash } from '@sand/kit'
import { isServerProvider } from './kinds'
import type { ServerEntry } from './store'

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
  let id = wanted
  for (let count = 2; taken(id); count++) id = `${wanted}-${count}`
  return id
}

const urlOf = (value: string) => {
  const trimmed = trimSlash(value.trim())
  try {
    const url = new URL(trimmed)
    if (url.protocol === 'http:' || url.protocol === 'https:') return { url: trimmed, port: url.port }
  } catch {}
  throw new Error('The server address must start with http:// or https://')
}

export const serverEntry = (draft: ServerDraft, servers: ServerEntry[], taken: (id: string) => boolean): ServerEntry => {
  const name = draft.name.trim()
  if (!name) throw new Error('Give the server a name')
  const { url, port } = urlOf(draft.url)
  const before = draft.id ? servers.find(server => server.id === draft.id) : undefined
  if (draft.id && !before) throw new Error(`Unknown server "${draft.id}"`)
  const provider = isServerProvider(draft.provider) ? draft.provider : (before?.provider ?? ports[port] ?? 'server')
  const id = before?.id ?? uniqueId(baseId(name, provider), taken)
  const key = draft.key === undefined ? before?.key : draft.key.trim()
  return { id, name, url, provider, ...(key && { key }), ...(before?.shared !== undefined && { shared: before.shared }) }
}

export const checkServer = async (server: ServerEntry) => {
  try {
    const response = await fetch(`${server.url}/models`, {
      headers: { accept: 'application/json', ...(server.key && bearer(server.key)) },
      signal: AbortSignal.timeout(5_000),
    })
    await response.body?.cancel()
    return response.ok ? undefined : `${server.name} answered HTTP ${response.status} at ${server.url}/models`
  } catch (error) {
    return `Couldn't reach ${server.name} at ${server.url}: ${errorMessage(error)}`
  }
}

import type { PlanTokens, ServerProvider } from '../contract'
import { serial } from '@sand/util'
import { readState, writePrivateJson } from '@sand/util/fs'
import { fieldsOf, isText } from './json'
import { isServerProvider } from './kinds'

export type OAuth = PlanTokens & { type: 'oauth'; shared?: boolean }

export interface ApiKey {
  type: 'api_key'
  key: string
  base_url?: string
  shared?: boolean
}

export type Credential = OAuth | ApiKey

export type Saved = Record<string, unknown>

export interface ServerEntry {
  id: string
  name: string
  url: string
  key?: string
  provider: ServerProvider
  shared?: boolean
}

const serverOf = (value: unknown): ServerEntry | undefined => {
  const { id, name, url, provider, key, shared } = fieldsOf(value)
  if (!isText(id) || !isText(url)) return undefined
  return {
    id,
    name: isText(name) ? name : id,
    url,
    provider: isServerProvider(provider) ? provider : 'server',
    ...(isText(key) && { key }),
    ...(typeof shared === 'boolean' && { shared }),
  }
}

export const serversOf = (saved: Saved): ServerEntry[] => (Array.isArray(saved.servers) ? saved.servers.flatMap(value => serverOf(value) ?? []) : [])

const isCredential = (value: unknown): value is Credential => {
  const fields = fieldsOf(value)
  if (fields.type === 'api_key') return isText(fields.key)
  return fields.type === 'oauth' && typeof fields.access === 'string' && typeof fields.refresh === 'string' && typeof fields.expires === 'number'
}

export const credentialOf = (saved: Saved, provider: string) => {
  const value = saved[provider]
  return isCredential(value) ? value : undefined
}

export const appShareOf = (saved: Saved, id: string) => {
  const { type, shared } = fieldsOf(saved[id])
  return type === 'app' && typeof shared === 'boolean' ? shared : undefined
}

export const authStore = (path: string) => {
  const queue = serial()
  return {
    read: async (): Promise<Saved> => (await readState(path, fieldsOf)) ?? {},
    write(saved: Saved) {
      return queue(() => writePrivateJson(path, saved))
    },
  }
}

import type { ServerProvider } from '../contract'
import { isRecord, serial } from '@sand/kit'
import { writePrivateJson } from '@sand/kit/fs'

export interface Tokens {
  access: string
  refresh: string
  expires: number
  email?: string
  plan?: string
  accountId?: string
}

export type OAuth = Tokens & { type: 'oauth'; shared?: boolean }

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

const serverProviders: ServerProvider[] = ['ollama', 'lmstudio', 'server']

const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0

const serverOf = (value: any): ServerEntry | undefined => {
  if (!text(value?.id) || !text(value.url)) return undefined
  return {
    id: value.id,
    name: text(value.name) ? value.name : value.id,
    url: value.url,
    provider: serverProviders.includes(value.provider) ? value.provider : 'server',
    ...(text(value.key) && { key: value.key }),
    ...(typeof value.shared === 'boolean' && { shared: value.shared }),
  }
}

export const serversOf = (saved: Saved): ServerEntry[] => (Array.isArray(saved.servers) ? saved.servers.flatMap(value => serverOf(value) ?? []) : [])

const isCredential = (value: any): value is Credential =>
  (value?.type === 'oauth' && typeof value.access === 'string' && typeof value.refresh === 'string' && typeof value.expires === 'number') ||
  (value?.type === 'api_key' && typeof value.key === 'string' && !!value.key)

export const credentialOf = (saved: Saved, provider: string) => {
  const value = saved[provider]
  return isCredential(value) ? value : undefined
}

export const authStore = (path: string) => {
  const queue = serial()
  return {
    async read(): Promise<Saved> {
      const file = Bun.file(path)
      if (!(await file.exists())) return {}
      try {
        const json: unknown = await file.json()
        return isRecord(json) ? json : {}
      } catch {
        return {}
      }
    },
    write(saved: Saved) {
      return queue(() => writePrivateJson(path, saved))
    },
  }
}

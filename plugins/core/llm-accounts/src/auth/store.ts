import type { ServerProvider } from '../contract'
import { replaceFile } from '@sand/kit/fs'
import { chmod, writeFile } from 'node:fs/promises'

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

export const writePrivateJson = async (path: string, value: unknown) => {
  const temporary = `${path}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  if (process.platform !== 'win32') await chmod(temporary, 0o600)
  await replaceFile(temporary, path)
}

const isCredential = (value: any): value is Credential =>
  (value?.type === 'oauth' && typeof value.access === 'string' && typeof value.refresh === 'string' && typeof value.expires === 'number') ||
  (value?.type === 'api_key' && typeof value.key === 'string' && !!value.key)

export const credentialOf = (saved: Saved, provider: string) => {
  const value = saved[provider]
  return isCredential(value) ? value : undefined
}

export const authStore = (path: string) => {
  let writing = Promise.resolve()
  return {
    async read(): Promise<Saved> {
      const file = Bun.file(path)
      if (!(await file.exists())) return {}
      try {
        const json = await file.json()
        return json && typeof json === 'object' && !Array.isArray(json) ? json : {}
      } catch {
        return {}
      }
    },
    write(saved: Saved) {
      writing = writing.catch(() => {}).then(() => writePrivateJson(path, saved))
      return writing
    },
  }
}

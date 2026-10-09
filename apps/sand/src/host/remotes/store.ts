import type { Remote, RemoteRecord } from '@sand/protocol'
import { join } from 'node:path'
import { writePrivateJson } from '../private'

const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0

const parse = (value: unknown): RemoteRecord | undefined => {
  if (!value || typeof value !== 'object') return
  const { id, name, platform, url, urls, key } = value as Record<string, unknown>
  if (!text(id) || !text(url) || !text(key)) return
  const routes = Array.isArray(urls) ? urls.filter(text) : []
  return {
    id,
    name: text(name) ? name : url,
    platform: text(platform) ? platform : '',
    url,
    urls: routes.length ? routes : [url],
    key,
  }
}

const read = async (file: string): Promise<RemoteRecord[]> => {
  try {
    const data: unknown = await Bun.file(file).json()
    return Array.isArray(data) ? data.flatMap(entry => parse(entry) ?? []) : []
  } catch {
    return []
  }
}

export const toRemote = ({ key: _, ...remote }: RemoteRecord): Remote => remote

export const remoteStore = async (home: string) => {
  const file = join(home, 'remotes.json')
  let records = await read(file)
  let saving: Promise<void> = Promise.resolve()
  const save = (next: RemoteRecord[]) => {
    records = next
    saving = saving.catch(() => {}).then(() => writePrivateJson(file, records))
    return saving
  }
  return {
    list: () => records,
    get: (id: string) => records.find(record => record.id === id),
    put: (record: RemoteRecord) => save([...records.filter(other => other.id !== record.id), record]),
    remove: (id: string) => save(records.filter(record => record.id !== id)),
  }
}

export type RemoteStore = Awaited<ReturnType<typeof remoteStore>>

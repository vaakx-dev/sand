import type { Remote, RemoteRecord } from '@sand/protocol'
import { join } from 'node:path'
import { serial } from '../../async/serial'
import { writePrivateJson } from '../../fs/private'
import { debouncedWatch } from '../../fs/watch'
import { isRecord } from '../../json/record'

const fileName = 'remotes.json'

const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0

const parse = (value: unknown): RemoteRecord | undefined => {
  if (!isRecord(value)) return
  const { id, name, platform, url, urls, key } = value
  if (!text(id) || !text(url) || !Array.isArray(urls) || !text(key)) return
  return {
    id,
    name: text(name) ? name : url,
    platform: text(platform) ? platform : '',
    url,
    urls: urls.filter(text),
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

export const remoteUrls = ({ url, urls }: Pick<RemoteRecord, 'url' | 'urls'>) => [...new Set([url, ...urls])]

export const remoteStore = async (home: string) => {
  const file = join(home, fileName)
  let records = await read(file)
  const queue = serial()
  const save = (next: RemoteRecord[]) => {
    records = next
    return queue(() => writePrivateJson(file, records))
  }
  return {
    list: () => records,
    get: (id: string) => records.find(record => record.id === id),
    put: (record: RemoteRecord) => save([...records.filter(other => other.id !== record.id), record]),
    remove: (id: string) => save(records.filter(record => record.id !== id)),
  }
}

export type RemoteStore = Awaited<ReturnType<typeof remoteStore>>

const isStoreFile = (filename: string | null) =>
  process.platform === 'win32' ? filename?.toLowerCase() === fileName : filename === fileName

export const watchRemotes = (home: string, onChange: () => void) => debouncedWatch(home, { only: isStoreFile }, onChange, 500)

import { isRecord } from '@sand/kit'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface RemotePc {
  id: string
  name: string
  urls: string[]
  key: string
}

const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0

const parse = (value: unknown): RemotePc | undefined => {
  if (!isRecord(value)) return
  const { id, name, url, urls, key } = value
  if (!text(id) || !text(url) || !Array.isArray(urls) || !text(key)) return
  return { id, name: text(name) ? name : url, urls: [...new Set([url, ...urls.filter(text)])], key }
}

const remotesPath = async (home: string) => {
  const own = join(home, 'remotes.json')
  return (await Bun.file(own).exists()) ? own : join(homedir(), '.sand', 'remotes.json')
}

export const readRemotes = async (home: string): Promise<RemotePc[]> => {
  try {
    const data: unknown = await Bun.file(await remotesPath(home)).json()
    return Array.isArray(data) ? data.flatMap(entry => parse(entry) ?? []) : []
  } catch {
    return []
  }
}

import { isRecord } from '@sand/util'
import { join } from 'node:path'

export interface Daemon {
  url: string
  key?: string
}

const readJson = async (path: string): Promise<unknown> => {
  try {
    return await Bun.file(path).json()
  } catch {
    return undefined
  }
}

const readKey = async (path: string) => {
  const file = Bun.file(path)
  return (await file.exists()) ? (await file.text()).trim() || undefined : undefined
}

export const findDaemon = async (home: string): Promise<Daemon | undefined> => {
  const info = await readJson(join(home, 'daemon.json'))
  if (!isRecord(info) || typeof info.port !== 'number') return undefined
  return { url: `http://127.0.0.1:${info.port}`, key: await readKey(join(home, 'local.key')) }
}

import type { RemoteRecord } from '@sand/host-remotes/contract'
import { join } from 'node:path'

const readList = async (file: string): Promise<RemoteRecord[]> => {
  try {
    const saved = await Bun.file(file).json()
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

export const readRemotes = async (home: string) =>
  (await readList(join(home, 'remotes.json'))).filter(remote => typeof remote?.key === 'string' && remote.key && typeof remote.url === 'string')

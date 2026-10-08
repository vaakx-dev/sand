import type { ServerInfo } from '@sand/protocol'
import { requireRunning } from '../daemon/info'

export interface SavedList<T> {
  usage: string
  empty: string
  describe(item: T): string
  list(info: ServerInfo): Promise<T[]>
  find(items: T[], value: string): T | undefined
  add(info: ServerInfo, value: string): Promise<string>
  remove(info: ServerInfo, item: T): Promise<string>
}

export const listCommand =
  <T>(saved: SavedList<T>) =>
  async (home: string, [action, value]: string[]) => {
    const info = await requireRunning(home)
    if (action === 'add' && value) return console.log(await saved.add(info, value))
    const listed = await saved.list(info)
    if (!action) return console.log(listed.length ? listed.map(saved.describe).join('\n') : saved.empty)
    const found = value ? saved.find(listed, value) : undefined
    if (action !== 'remove' || !found) throw new Error(saved.usage)
    console.log(await saved.remove(info, found))
  }

import type { Daemon } from '@sand/protocol'

export interface SavedList<T> {
  usage: string
  empty: string
  describe(item: T): string
  list(daemon: Daemon): Promise<T[]>
  find(items: T[], value: string): T | undefined
  add(daemon: Daemon, value: string): Promise<string>
  remove(daemon: Daemon, item: T): Promise<string>
}

export const listCommand =
  <T>(saved: SavedList<T>) =>
  async (daemon: Daemon, [action, value]: string[]) => {
    await daemon.require()
    if (action === 'add' && value) return console.log(await saved.add(daemon, value))
    const listed = await saved.list(daemon)
    if (!action) return console.log(listed.length ? listed.map(saved.describe).join('\n') : saved.empty)
    const found = value ? saved.find(listed, value) : undefined
    if (action !== 'remove' || !found) throw new Error(saved.usage)
    console.log(await saved.remove(daemon, found))
  }

import { join } from 'node:path'
import type { FolderState } from '../folder/state'
import type { SyncedFolder } from '../folder/synced'

const markers = /^(<{7}|={7}|>{7})/m

const hasMarkers = async (file: string) => markers.test(await Bun.file(file).text().catch(() => ''))

const fingerprint = async (file: string) => {
  const target = Bun.file(file)
  if (!(await target.exists())) return ''
  return new Bun.CryptoHasher('sha1').update(await target.bytes()).digest('hex')
}

const stillOpen = async (synced: SyncedFolder, state: FolderState, path: string) => {
  const file = join(synced.folder, path)
  if (await hasMarkers(file)) return true
  return state.unmarked[path] === (await fingerprint(file))
}

export const remaining = async (synced: SyncedFolder, state: FolderState) => {
  const open = await Promise.all(state.conflicts.map(path => stillOpen(synced, state, path)))
  return state.conflicts.filter((_, index) => open[index])
}

export const unmarkedStamps = async (synced: SyncedFolder, paths: string[]) => {
  const stamps: Record<string, string> = {}
  for (const path of paths) {
    const file = join(synced.folder, path)
    if (!(await hasMarkers(file))) stamps[path] = await fingerprint(file)
  }
  return stamps
}

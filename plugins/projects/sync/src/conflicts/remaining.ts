import { join } from 'node:path'
import type { Hidden } from '../folder/hidden'
import type { FolderState } from '../folder/store'

const markers = /^(<{7}|={7}|>{7})/m

const hasMarkers = async (file: string) => markers.test(await Bun.file(file).text().catch(() => ''))

const fingerprint = async (file: string) => {
  const target = Bun.file(file)
  if (!(await target.exists())) return ''
  return new Bun.CryptoHasher('sha1').update(await target.bytes()).digest('hex')
}

const stillOpen = async (hidden: Hidden, state: FolderState, path: string) => {
  const file = join(hidden.folder, path)
  if (await hasMarkers(file)) return true
  return state.unmarked[path] === (await fingerprint(file))
}

export const remaining = async (hidden: Hidden, state: FolderState) => {
  const open = await Promise.all(state.conflicts.map(path => stillOpen(hidden, state, path)))
  return state.conflicts.filter((_, index) => open[index])
}

export const unmarkedStamps = async (hidden: Hidden, paths: string[]) => {
  const stamps: Record<string, string> = {}
  for (const path of paths) {
    const file = join(hidden.folder, path)
    if (!(await hasMarkers(file))) stamps[path] = await fingerprint(file)
  }
  return stamps
}

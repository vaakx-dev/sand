import { join } from 'node:path'
import type { Hidden } from '../folder/hidden'
import type { FolderState } from '../folder/store'

const markers = /^(<{7}|={7}|>{7})/m

export const fingerprint = async (file: string) => {
  const target = Bun.file(file)
  if (!(await target.exists())) return ''
  return new Bun.CryptoHasher('sha1').update(await target.bytes()).digest('hex')
}

const stillOpen = async (hidden: Hidden, state: FolderState, path: string) => {
  const file = join(hidden.folder, path)
  const target = Bun.file(file)
  if (!(await target.exists())) return state.unmarked[path] === ''
  if (markers.test(await target.text().catch(() => ''))) return true
  const stamp = state.unmarked[path]
  return stamp !== undefined && stamp === (await fingerprint(file))
}

export const remaining = async (hidden: Hidden, state: FolderState) => {
  const open = await Promise.all(state.conflicts.map(path => stillOpen(hidden, state, path)))
  return state.conflicts.filter((_, index) => open[index])
}

export const stamps = async (hidden: Hidden, paths: string[]) => {
  const entries = await Promise.all(
    paths.map(async path => {
      const file = join(hidden.folder, path)
      const text = await Bun.file(file).text().catch(() => '')
      return markers.test(text) ? undefined : ([path, await fingerprint(file)] as const)
    }),
  )
  return Object.fromEntries(entries.filter(entry => entry !== undefined))
}

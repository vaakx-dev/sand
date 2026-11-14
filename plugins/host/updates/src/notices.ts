import { readUpdateNotice } from '@sand/boot/notice'
import { readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import type { HomeNotice } from './contract'

interface SetAside {
  file: string
  copy: string
}

const UPDATE = 'update'
const DEPTH = 2
const SKIPPED = new Set(['app', 'bun', 'bin', 'plugins', 'node_modules', 'cache', 'worktrees'])
const DAMAGED = /^(.+)\.damaged-\d{4}-\d\d-\d\dT[\d-]+Z$/

const RESETS: Record<string, string> = {
  'sand.toml': 'Your settings in sand.toml were reset',
  'auth.json': 'Your accounts were signed out; sign in to them again',
  'devices/identity.json': "This PC's identity was reset, so your other PCs and phones must pair with it again",
  'devices/devices.json': 'Your list of paired PCs and phones was reset; pair them again',
  'notify/vapid.json': 'Notifications were reset; turn them on again in each browser',
  'projects.json': 'Your list of projects was reset',
  'drafts.json': 'Your unsent drafts were reset',
}

const posix = (path: string) => path.split(sep).join('/')

const damagedIn = async (home: string, dir: string, depth: number): Promise<SetAside[]> => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = entries.flatMap(entry => {
    const original = entry.isFile() ? DAMAGED.exec(entry.name)?.[1] : undefined
    return original ? [{ file: posix(relative(home, join(dir, original))), copy: join(dir, entry.name) }] : []
  })
  if (depth >= DEPTH) return files
  const folders = entries.filter(entry => entry.isDirectory() && !(depth === 0 && SKIPPED.has(entry.name)) && !entry.name.startsWith('.'))
  const nested = await Promise.all(folders.map(entry => damagedIn(home, join(dir, entry.name), depth + 1)))
  return [...files, ...nested.flat()]
}

const resetNotice = (home: string, { file, copy }: SetAside): HomeNotice => ({
  id: posix(relative(home, copy)),
  title: RESETS[file] ?? `${file} was reset`,
  detail: `${file} was damaged, so sand set it aside as ${copy} and started it again from defaults. The old copy is kept there if you need anything from it.`,
})

const homeNotices = async (home: string, dismissed: (id: string) => boolean): Promise<HomeNotice[]> => {
  const [update, damaged] = await Promise.all([readUpdateNotice(home), damagedIn(home, home, 0)])
  const resets = damaged.map(found => resetNotice(home, found)).filter(notice => !dismissed(notice.id))
  return [...(update ? [{ id: UPDATE, title: 'sand stayed on the new build', detail: update.text }] : []), ...resets]
}

export { homeNotices, UPDATE }

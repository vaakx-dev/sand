import { readUpdateNotice } from '@sand/boot/notice'
import { plural } from '@sand/util'
import { readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import type { HomeNotice } from './contract'

interface SetAside {
  id: string
  file: string
  copy: string
}

interface Reset {
  what: string
  then?: string
}

const UPDATE = 'update'
const RESETS = 'resets'
const DEPTH = 2
const SKIPPED = new Set(['app', 'bun', 'bin', 'plugins', 'node_modules', 'cache', 'worktrees'])
const DAMAGED = /^(.+)\.damaged-\d{4}-\d\d-\d\dT[\d-]+Z$/

const KNOWN: Record<string, Reset> = {
  'sand.toml': { what: 'settings' },
  'auth.json': { what: 'accounts', then: 'sign in again' },
  'devices/identity.json': { what: "this PC's pairing", then: 'pair your PCs and phones again' },
  'devices/devices.json': { what: 'paired devices', then: 'pair them again' },
  'notify/vapid.json': { what: 'notifications', then: 'turn them on again' },
  'projects.json': { what: 'projects' },
  'drafts.json': { what: 'drafts' },
}

const posix = (path: string) => path.split(sep).join('/')

const damagedIn = async (home: string, dir: string, depth: number): Promise<SetAside[]> => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = entries.flatMap(entry => {
    const original = entry.isFile() ? DAMAGED.exec(entry.name)?.[1] : undefined
    const copy = join(dir, entry.name)
    return original ? [{ id: posix(relative(home, copy)), file: posix(relative(home, join(dir, original))), copy }] : []
  })
  if (depth >= DEPTH) return files
  const folders = entries.filter(entry => entry.isDirectory() && !(depth === 0 && SKIPPED.has(entry.name)) && !entry.name.startsWith('.'))
  const nested = await Promise.all(folders.map(entry => damagedIn(home, join(dir, entry.name), depth + 1)))
  return [...files, ...nested.flat()]
}

const sentence = (parts: string[]) => {
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : (parts[0] ?? '')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const resetsNotice = (resets: SetAside[]): HomeNotice => {
  const known = resets.map(reset => KNOWN[reset.file] ?? { what: reset.file })
  const title = resets.length === 1 ? `${sentence([known[0]!.what])} ${known[0]!.what.endsWith('s') ? 'were' : 'was'} reset` : `${plural(resets.length, 'file')} were reset`
  const todo = known.flatMap(reset => reset.then ?? [])
  const what = resets.length === 1 ? '' : `${sentence(known.map(reset => reset.what))}. `
  return {
    id: RESETS,
    title,
    summary: `${what}${todo.length ? `${sentence(todo)}. ` : ''}The old ${resets.length === 1 ? 'file is' : 'files are'} kept.`,
    details: resets.map(reset => `${reset.file} was damaged and was set aside as\n${reset.copy}`).join('\n\n'),
  }
}

const updateNotice = (text: string): HomeNotice => ({
  id: UPDATE,
  title: 'Part of sand is off after the update',
  summary: 'Your chats and bots are safe. Update again when a newer build is out.',
  details: text,
})

const homeNotices = async (home: string, dismissed: (id: string) => boolean): Promise<HomeNotice[]> => {
  const [update, damaged] = await Promise.all([readUpdateNotice(home), damagedIn(home, home, 0)])
  const resets = damaged.filter(found => !dismissed(found.id))
  return [...(update ? [updateNotice(update.text)] : []), ...(resets.length ? [resetsNotice(resets)] : [])]
}

const setAsideIds = async (home: string) => (await damagedIn(home, home, 0)).map(found => found.id)

export { homeNotices, RESETS, setAsideIds, UPDATE }

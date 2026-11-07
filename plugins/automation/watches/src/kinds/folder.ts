import { serial } from '@sand/util'
import { expandHome, isFolder } from '@sand/util/fs'
import type { Watcher } from '@sand/watch/contract'
import { readdir, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { z } from 'zod'
import type { Change, Kind } from '../contract'

const input = z.object({
  path: z.string().min(1).describe('The folder to watch'),
  recursive: z.boolean().optional().describe('Also watch its subfolders'),
})

const snapshot = z.record(z.string(), z.tuple([z.number(), z.number()]))
type Snapshot = z.output<typeof snapshot>

const ignored = new Set(['.git', 'node_modules'])
const detailMost = 8_000

const isIgnored = (name: string) => name.split(/[\\/]/).some(part => ignored.has(part))

const scan = async (root: string, recursive: boolean) => {
  const files: Snapshot = {}
  const walk = async (folder: string) => {
    const entries = await readdir(join(root, folder), { withFileTypes: true }).catch(() => undefined)
    if (!entries) return
    await Promise.all(
      entries.map(async entry => {
        if (ignored.has(entry.name)) return
        const name = folder ? `${folder}/${entry.name}` : entry.name
        if (entry.isDirectory()) return recursive ? walk(name) : undefined
        if (!entry.isFile()) return
        const info = await stat(join(root, name)).catch(() => undefined)
        if (info) files[name] = [info.size, Math.round(info.mtimeMs)]
      }),
    )
  }
  await walk('')
  return files
}

const compare = (before: Snapshot, after: Snapshot) => {
  const added: string[] = []
  const changed: string[] = []
  for (const [name, [size, mtime]] of Object.entries(after)) {
    const old = before[name]
    if (!old) added.push(name)
    else if (old[0] !== size || old[1] !== mtime) changed.push(name)
  }
  const removed = Object.keys(before).filter(name => !(name in after))
  return { added, changed, removed }
}

type Difference = ReturnType<typeof compare>

const verbs = ['added', 'changed', 'removed'] as const
const marks: Record<(typeof verbs)[number], string> = { added: '+', changed: '~', removed: '-' }

const clip = (text: string) => (text.length > detailMost ? `${text.slice(0, detailMost)}…` : text)

const changeOf = (root: string, difference: Difference, after: Snapshot): Change | undefined => {
  const groups = verbs.map(verb => ({ verb, names: difference[verb] })).filter(group => group.names.length)
  const [only] = groups
  if (!only) return
  const latest = [...difference.added, ...difference.changed].reduce((most, name) => Math.max(most, after[name]?.[1] ?? 0), 0)
  const single = groups.length === 1 && only.names.length === 1
  return {
    at: latest || Date.now(),
    from: root,
    summary: single ? `${only.verb} ${only.names[0]}` : `${groups.map(group => `${group.names.length} ${group.verb}`).join(', ')} in ${basename(root)}`,
    detail: clip(groups.flatMap(group => group.names.map(name => `${marks[group.verb]} ${name}`)).join('\n')),
  }
}

export const folderKind = (watcher: Pick<Watcher, 'debounced'>): Kind<typeof input> => ({
  name: 'folder',
  label: 'Folder',
  description: 'Files added, changed or removed in a folder, skipping .git and node_modules',
  input,
  describe: ({ path, recursive }) => `Files in ${basename(path)}${recursive ? ' and its subfolders' : ''}`,
  async start({ path: given, recursive = false }, context) {
    const root = expandHome(given)
    if (!(await isFolder(root))) throw new Error(`${root} is not a folder`)
    const saved = snapshot.safeParse(context.state)
    const run = serial()
    let known = saved.success ? saved.data : await scan(root, recursive)
    if (!saved.success) context.save(known)

    const check = async () => {
      const after = await scan(root, recursive)
      const change = changeOf(root, compare(known, after), after)
      if (!change) return
      known = after
      context.save(after)
      context.emit(change)
    }

    const changed = () => void run(check).catch(error => context.fail(error))
    const stop = watcher.debounced(root, { recursive, only: name => !name || !isIgnored(name) }, changed)
    if (saved.success) changed()
    return { stop }
  },
})

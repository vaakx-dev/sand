import type { Machine, PaletteItem, PalettePage } from '@sand/protocol'
import { listings } from './listings'
import { absolute, join, leafName, short, split } from './paths'
import { deviceOf, type FlowContext, type Next, type Repo } from './types'

interface Options {
  mode: 'add' | 'clone'
  repo?: Repo
}

export const folderPage = (ctx: FlowContext, machine: Machine, next: Next, { mode, repo }: Options): PalettePage => {
  const device = deviceOf(machine)
  const place = ctx.projects.place(device)
  const { sep } = place
  const root = short(place.root, place)
  const folders = listings(ctx, device)
  const known = new Set(ctx.projects.list().filter(project => project.device === device).map(project => project.path))

  const state = (value: string) => {
    const { dir, leaf } = split(value, sep)
    const listing = dir === undefined ? undefined : folders.get(dir)
    const target = dir === undefined ? '' : leaf ? join(dir, leaf, sep) : dir
    const exists = leaf ? Boolean(listing?.folders.includes(leaf)) : Boolean(listing?.exists)
    const label = mode === 'clone' ? (exists ? 'Folder exists' : 'Create & clone') : exists ? 'Add' : 'Create & add'
    const enabled = Boolean(listing) && Boolean(target) && absolute(target, place) !== place.home && !(mode === 'clone' && exists)
    return { dir, leaf, listing, target, exists, label, enabled }
  }

  const rows = async (value: string): Promise<PaletteItem[]> => {
    const { dir, leaf } = split(value, sep)
    if (dir === undefined) return []
    const listing = await folders.load(dir)
    if (!listing.exists) return []
    const parent = split(dir, sep).dir
    const up: PaletteItem[] = parent !== undefined && dir !== parent && !leaf ? [{ id: 'folder:..', icon: 'up', label: '..', fill: join(parent, '', sep) }] : []
    const shown = listing.folders.filter(name => name.toLowerCase().startsWith(leaf.toLowerCase()))
    return [
      ...up,
      ...shown.map((name): PaletteItem => {
        const full = join(dir, name, sep)
        const project = known.has(absolute(full, place))
        return { id: `folder:${full}`, ...(project ? { avatar: name, detail: 'Already a project' } : { icon: 'folder' }), label: name, fill: join(full, '', sep) }
      }),
    ]
  }

  const empty = (value: string) => {
    const found = state(value)
    if (found.dir === undefined) return `Type a path that starts with ${root.startsWith('~') ? '~' : sep}`
    if (!found.listing) return ''
    if (!found.listing.exists) return `${found.dir} does not exist.`
    if (mode === 'clone' && found.exists) return `${found.target} already exists. Pick a new folder name.`
    if (found.leaf && !found.exists) return `No folder named “${found.leaf}” here.`
    return 'No folders here.'
  }

  return {
    id: mode === 'clone' ? 'clone-to' : 'folder',
    title: mode === 'clone' ? 'Clone to' : 'Local folder',
    empty,
    items: rows,
    card: () => (repo ? { label: 'Repository', icon: 'link', title: repo.name, detail: repo.url, mono: true } : undefined),
    field: {
      kind: 'path',
      value: repo ? join(root, repo.name, sep) : join(root, '', sep),
      placeholder: 'Folder path',
      action: value => state(value),
      submit(value) {
        const found = state(value)
        if (!found.enabled) return
        const path = found.target
        const how = mode === 'clone' ? 'clone' : found.exists ? 'add' : 'create-folder'
        return next({ machine, source: mode === 'clone' ? 'Git URL' : 'Local folder', how, path, name: leafName(path, sep), repo })
      },
    },
  }
}

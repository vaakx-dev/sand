import type { PcView } from '@sand/devices-contract'
import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import type { ProjectsContext } from '../context'
import { listings } from './listings'
import { absolute, join, leafName, short, split } from './paths'
import type { Next } from './types'

export const folderPage = (ctx: ProjectsContext, pc: PcView, next: Next): PalettePage => {
  const device = pc.id
  const place = ctx.projects.place(device)
  const { sep } = place
  const root = short(place.root, place)
  const folders = listings(ctx, device)
  const known = new Set(ctx.projects.list().filter(project => project.device === device).map(project => project.path))

  const targetOf = (dir: string | undefined, leaf: string) => {
    if (dir === undefined) return ''
    return leaf ? join(dir, leaf, sep) : dir
  }

  const state = (value: string) => {
    const { dir, leaf } = split(value, sep)
    const listing = dir === undefined ? undefined : folders.get(dir)
    const target = targetOf(dir, leaf)
    const exists = leaf ? Boolean(listing?.folders.includes(leaf)) : Boolean(listing?.exists)
    const enabled = Boolean(listing) && Boolean(target) && absolute(target, place) !== place.home
    return { dir, leaf, listing, target, exists, label: exists ? 'Add' : 'Create & add', enabled }
  }

  const upItem = (dir: string, leaf: string): PaletteItem[] => {
    const parent = split(dir, sep).dir
    if (parent === undefined || parent === dir || leaf) return []
    return [{ id: 'folder:..', icon: 'up', label: '..', fill: join(parent, '', sep) }]
  }

  const folderItem = (dir: string, name: string): PaletteItem => {
    const full = join(dir, name, sep)
    const item = { id: `folder:${full}`, label: name, fill: join(full, '', sep) }
    return known.has(absolute(full, place)) ? { ...item, avatar: name, detail: 'Already a project' } : { ...item, icon: 'folder' }
  }

  const rows = async (value: string): Promise<PaletteItem[]> => {
    const { dir, leaf } = split(value, sep)
    if (dir === undefined) return []
    const listing = await folders.load(dir)
    if (!listing.exists) return []
    const shown = listing.folders.filter(name => name.toLowerCase().startsWith(leaf.toLowerCase()))
    return [...upItem(dir, leaf), ...shown.map(name => folderItem(dir, name))]
  }

  const empty = (value: string) => {
    const found = state(value)
    if (found.dir === undefined) return `Type a path that starts with ${root.startsWith('~') ? '~' : sep}`
    if (!found.listing) return ''
    if (!found.listing.exists) return `${found.dir} does not exist.`
    if (found.leaf && !found.exists) return `No folder named “${found.leaf}” here.`
    return 'No folders here.'
  }

  const submit = (value: string) => {
    const found = state(value)
    if (!found.enabled) return
    const path = found.target
    return next({ pc, path, name: leafName(path, sep), source: 'Local folder', how: found.exists ? 'add' : 'create-folder' })
  }

  return {
    id: 'folder',
    title: 'Local folder',
    empty,
    items: rows,
    field: {
      kind: 'path',
      value: join(root, '', sep),
      placeholder: 'Folder path',
      action: state,
      submit,
    },
  }
}

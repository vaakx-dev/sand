import type { PcView } from '@sand/devices-contract'
import type { PalettePage } from '@sand/palette/contract'
import type { ProjectsContext } from '../context'
import { listings } from './listings'
import { join, short } from './paths'
import type { Next } from './types'

const plain = (name: string) => Boolean(name) && name !== '.' && name !== '..' && !/[\\/]/.test(name)

export const emptyPage = (ctx: ProjectsContext, pc: PcView, next: Next): PalettePage => {
  const device = pc.id
  const place = ctx.projects.place(device)
  const root = short(place.root, place)
  const folders = listings(ctx, device)
  void folders.load(place.root).catch(() => {})
  const taken = (name: string) => Boolean(folders.get(place.root)?.folders.includes(name))
  const target = (name: string) => join(root, name, place.sep)

  return {
    id: 'empty',
    title: 'Empty project',
    empty: '',
    card(value) {
      const name = value.trim()
      if (!name) return { icon: 'folder', title: 'New project', detail: `Goes in ${root} on ${pc.name}` }
      if (taken(name)) return { icon: 'folder', title: name, detail: `${target(name)} already exists`, warn: true }
      return { icon: 'folder', title: name, detail: `Creates ${target(name)} on ${pc.name}` }
    },
    field: {
      kind: 'text',
      value: '',
      placeholder: 'Project name',
      action: value => ({ label: 'Create', enabled: plain(value.trim()) && !taken(value.trim()) }),
      submit(value) {
        const name = value.trim()
        return next({ pc, source: 'Empty project', how: 'create', path: target(name), name })
      },
    },
  }
}

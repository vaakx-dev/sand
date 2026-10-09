import type { PalettePage } from '@sand/palette/contract'
import type { Machine } from '@sand/web-client/contract'
import { listings } from './listings'
import { join, short } from './paths'
import { deviceOf, type FlowContext, type Next } from './types'

const plain = (name: string) => Boolean(name) && name !== '.' && name !== '..' && !/[\\/]/.test(name)

export const emptyPage = (ctx: FlowContext, machine: Machine, next: Next): PalettePage => {
  const device = deviceOf(machine)
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
      if (!name) return { icon: 'folder-git', title: 'New project', detail: `Goes in ${root} on ${machine.name}` }
      if (taken(name)) return { icon: 'folder-git', title: name, detail: `${target(name)} already exists`, warn: true }
      return { icon: 'folder-git', title: name, detail: `Creates ${target(name)} on ${machine.name}` }
    },
    field: {
      kind: 'text',
      value: '',
      placeholder: 'Project name',
      action: value => ({ label: 'Create', enabled: plain(value.trim()) && !taken(value.trim()) }),
      submit: value => next({ machine, source: 'Empty project', how: 'create', path: target(value.trim()), name: value.trim() }),
    },
  }
}

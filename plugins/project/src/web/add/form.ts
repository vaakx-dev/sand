import type { Pulse } from '@sand/reactive'
import { derive, sig, type Sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import { cache } from './cache'
import { join, short } from './paths'
import { pickPc } from './pcs'

export type Kind = 'folder' | 'empty'

export const keepNew = ''

export interface Match {
  target: string
  project: string
}

interface Draft {
  path: Sig<string>
  name: Sig<string>
}

export const addForm = (ctx: ProjectsContext, changes: Pulse) => {
  const pcs = changes.read(() => ctx.pcs.list())
  const chosen = sig<string | undefined>(undefined)
  const pc = derive(() => pickPc(pcs.get(), chosen.get()))
  const drafts = new Map<string, Draft>()
  const draftOf = (device: string) => {
    const known = drafts.get(device)
    if (known) return known
    const place = ctx.projects.place(device)
    const draft = { path: sig(join(short(place.root, place), '', place.sep)), name: sig('') }
    drafts.set(device, draft)
    return draft
  }
  return {
    pcs,
    pc,
    device: derive(() => pc.get()?.id),
    choose: (device: string) => chosen.set(device),
    draftOf,
    kind: sig<Kind>('folder'),
    match: sig<Match | undefined>(undefined),
    projects: changes.read(() => ctx.projects.list()),
    listing: cache((device, dir) => ctx.projects.browse(dir, device)),
    folder: cache((device, path) => ctx.projects.inspect(path, device)),
  }
}

export type AddForm = ReturnType<typeof addForm>

import type { PcView } from '@sand/devices-contract'
import { sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../../context'
import { cache } from '../cache'
import { join, short } from '../paths'

export const keepNew = ''

export interface Match {
  target: string
  project: string
}

export const folderForm = (ctx: ProjectsContext, pc: PcView) => {
  const place = ctx.projects.place(pc.id)
  return {
    pc,
    place,
    path: sig(join(short(place.root, place), '', place.sep)),
    match: sig<Match | undefined>(undefined),
    listing: cache(dir => ctx.projects.browse(dir, pc.id)),
    folder: cache(path => ctx.projects.inspect(path, pc.id)),
  }
}

export type FolderForm = ReturnType<typeof folderForm>

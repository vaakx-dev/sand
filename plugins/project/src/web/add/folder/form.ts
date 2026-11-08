import type { PcView } from '@sand/devices-contract'
import { sig } from '@vaakx-dev/vrui'
import type { Projects } from '@sand/web-client/contract'
import { cache } from '../cache'
import { join, short } from '../paths'

export const keepNew = ''

export interface Match {
  target: string
  project: string
}

export const folderForm = (projects: Pick<Projects, 'place' | 'browse' | 'inspect'>, pc: Pick<PcView, 'id' | 'name'>) => {
  const place = projects.place(pc.id)
  return {
    pc,
    place,
    path: sig(join(short(place.root, place), '', place.sep)),
    match: sig<Match | undefined>(undefined),
    listing: cache(dir => projects.browse(dir, pc.id)),
    folder: cache(path => projects.inspect(path, pc.id)),
  }
}

export type FolderForm = ReturnType<typeof folderForm>

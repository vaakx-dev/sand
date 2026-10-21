import { errorMessage } from '@sand/util'
import type { Wire } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import { orrinProjectRemove, orrinProjectsGet, orrinProjectUnlanded, orrinViewDrop, type OrrinProjects } from '../../contract'

export const projectSource = (wire: Wire) => {
  const state = sig<OrrinProjects | undefined>(undefined)
  const error = sig<string | undefined>(undefined)
  const busy = sig(false)

  const settle = async (work: Promise<OrrinProjects>) => {
    busy.set(true)
    try {
      state.set(await work)
      error.set(undefined)
    } catch (failure) {
      error.set(errorMessage(failure))
    } finally {
      busy.set(false)
    }
  }

  return {
    state,
    error,
    busy,
    set: (value: OrrinProjects) => state.set(value),
    refresh: () => settle(wire.call(orrinProjectsGet, {})),
    remove: (project: string, deleteFolder = false) => settle(wire.call(orrinProjectRemove, { project, deleteFolder })),
    drop: (view: string) => settle(wire.call(orrinViewDrop, { view })),
    unlanded: (project: string) => wire.call(orrinProjectUnlanded, { project }).then(({ files }) => files),
  }
}

export type ProjectSource = ReturnType<typeof projectSource>

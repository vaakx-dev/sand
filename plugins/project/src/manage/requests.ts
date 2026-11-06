import { findPc, noSuchPc } from '@sand/devices-contract'
import type { GitRunner } from '@sand/git-runner/contract'
import type { Hub } from '@sand/host-hub/contract'
import { compare } from '@sand/util'
import type { Dispose } from 'drydock'
import {
  type Project,
  runtimeProjectCreate,
  runtimeProjectRemove,
  runtimeProjectRoot,
  runtimeProjectRow,
  runtimeProjectRows,
  runtimeProjectUpdate,
} from '../contract'
import { localCopy } from '../registry/list'
import { fullPath } from '../registry/paths'
import type { Registry } from '../registry/registry'
import type { ProjectRoot } from '../registry/root'
import { createProject } from './create'
import { projectRow } from './row'

interface Pc {
  id: string
  name: string
}

interface ManageRequests {
  hub: Pick<Hub, 'handle'>
  registry: Registry
  root: ProjectRoot
  device: string
  pcs: () => Pc[]
  git: () => GitRunner | undefined
  placeChanged: () => void
}

export const manageRequests = ({ hub, registry, root, device, pcs, git, placeChanged }: ManageRequests): (() => Dispose)[] => {
  const row = (project: Project) => projectRow(project, device, new Map(pcs().map(pc => [pc.id, pc.name])))

  const rows = () => {
    const live = registry.all().filter(project => !project.deleted)
    return live.map(row).sort((a, b) => compare(a.name.toLowerCase(), b.name.toLowerCase()))
  }

  const removeCopy = async (project: Project, pc: string) => {
    const known = pcs()
    const target = findPc(known, pc)
    if (!target) throw new Error(noSuchPc(known, pc))
    if (!localCopy(project, target.id)) throw new Error(`${project.name} has no folder on ${target.name}`)
    await registry.remove(project.id, target.id)
    return row(await registry.find(project.id))
  }

  const remove = async (id: string, pc: string | undefined) => {
    const project = await registry.find(id)
    if (pc) return removeCopy(project, pc)
    await registry.remove(id)
    return { project: id, removed: true as const }
  }

  const setRoot = async (folder: string | undefined) => {
    if (folder) {
      await root.set(fullPath(folder))
      placeChanged()
    }
    return { root: root.get() }
  }

  return [
    () => hub.handle(runtimeProjectRows, rows),
    () => hub.handle(runtimeProjectRow, async ({ project }) => row(await registry.find(project))),
    () =>
      hub.handle(runtimeProjectCreate, async input => {
        const { project, sameRemote } = await createProject(input, { registry, root: root.get(), git: git() })
        return { ...row(project), ...(sameRemote.length > 0 && { sameRemote }) }
      }),
    () => hub.handle(runtimeProjectUpdate, async ({ project, ...patch }) => row(await registry.update(project, patch))),
    () => hub.handle(runtimeProjectRemove, ({ project, pc }) => remove(project, pc)),
    () => hub.handle(runtimeProjectRoot, ({ folder }) => setRoot(folder)),
  ]
}

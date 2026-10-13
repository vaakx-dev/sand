import { serial } from '@sand/kit'
import { keepProjectIcon, projectIconFile } from '@sand/kit/host'
import type { Project } from '../contract'
import { localCopy } from '../list'
import type { Registry } from '../registry'
import { readCopyIcon, writeCopyIcon } from './copy'
import { watchSandFolder } from './watch'

const syncCopy = async (registry: Registry, home: string, project: Project, folder: string) => {
  const local = await readCopyIcon(folder)
  const shared = project.iconFile
  if (local) await keepProjectIcon(home, local.iconFile.hash, local.bytes)
  if (local?.iconFile.hash === shared?.hash) return
  if (local && local.iconFile.updated > (shared?.updated ?? 0)) {
    await registry.setIconFile(project.id, local.iconFile)
    return
  }
  if (!shared) return
  const file = await projectIconFile(home, shared.hash)
  if (file) await writeCopyIcon(folder, await file.bytes(), shared.type)
}

export const iconSync = (registry: Registry, device: string, home: string, report: (error: unknown) => void) => {
  const queue = serial()
  const watchers = new Map<string, () => void>()

  const copies = () =>
    registry.all().flatMap(project => {
      const copy = localCopy(project, device)
      return copy ? [{ project, folder: copy.path }] : []
    })

  const sync = () =>
    void queue(async () => {
      for (const { project, folder } of copies()) await syncCopy(registry, home, project, folder).catch(report)
    })

  const follow = () => {
    const folders = new Set(copies().map(copy => copy.folder))
    for (const [folder, stop] of watchers) {
      if (folders.has(folder)) continue
      stop()
      watchers.delete(folder)
    }
    for (const folder of folders) if (!watchers.has(folder)) watchers.set(folder, watchSandFolder(folder, sync))
  }

  return {
    changed() {
      follow()
      sync()
    },
    close() {
      for (const stop of watchers.values()) stop()
      watchers.clear()
    },
  }
}

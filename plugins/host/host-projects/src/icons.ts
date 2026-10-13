import { projectIconPath, projectIconTypes } from '@sand/kit/fs'
import { fileHash } from '@sand/kit/host'
import { join } from 'node:path'
import { localCopy } from './list'
import type { Registry } from './registry'

const newerIcon = async (folder: string, since: number) => {
  for (const [extension, type] of Object.entries(projectIconTypes)) {
    const file = Bun.file(join(folder, '.sand', `icon.${extension}`))
    if (!(await file.exists())) continue
    if (file.lastModified <= since) return undefined
    const bytes = await file.bytes()
    return { bytes, iconFile: { hash: fileHash(bytes), type, updated: file.lastModified } }
  }
  return undefined
}

export const importIcons = async (registry: Registry, device: string, home: string) => {
  for (const project of registry.all()) {
    const copy = localCopy(project, device)
    if (!copy) continue
    const found = await newerIcon(copy.path, project.iconFile?.updated ?? 0)
    if (!found || found.iconFile.hash === project.iconFile?.hash) continue
    await Bun.write(projectIconPath(home, found.iconFile.hash), found.bytes)
    await registry.setIconFile(project.id, found.iconFile)
  }
}

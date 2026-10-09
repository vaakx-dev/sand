import { folderEntries } from '@sand/host'
import { join } from 'node:path'

export const skipped = new Set(['node_modules', '.git'])

export const walkFiles = async (cwd: string, limit: number) => {
  const found: string[] = []
  const visit = async (dir: string) => {
    const { files, folders } = await folderEntries(join(cwd, dir))
    const inside = (name: string) => (dir ? `${dir}/${name}` : name)
    for (const name of files) {
      if (found.length >= limit) return
      if (!skipped.has(name)) found.push(inside(name))
    }
    for (const name of folders) {
      if (found.length >= limit) return
      if (!skipped.has(name)) await visit(inside(name))
    }
  }
  await visit('')
  return found
}

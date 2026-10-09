import { mkdir, realpath, rm, symlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const resolves = (path: string) => realpath(path).then(
  () => true,
  () => false,
)

const findPackage = async (name: string) => {
  for (let dir = import.meta.dir; ; dir = dirname(dir)) {
    const found = await realpath(join(dir, 'node_modules', name)).catch(() => undefined)
    if (found) return found
    if (dir === dirname(dir)) return undefined
  }
}

export const linkDependencies = async (dir: string, names: string[]) => {
  for (const name of names) {
    const path = join(dir, 'node_modules', name)
    if (await resolves(path)) continue
    const target = await findPackage(name)
    if (!target) continue
    await rm(path, { force: true })
    await mkdir(dirname(path), { recursive: true })
    await symlink(target, path, process.platform === 'win32' ? 'junction' : 'dir')
  }
}

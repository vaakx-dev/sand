import { lstat, mkdir, readlink, realpath, rmdir, symlink, unlink } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { readManifest } from './manifest'

const windows = process.platform === 'win32'

const removeLink = (path: string) => unlink(path).catch(error => (windows ? rmdir(path) : Promise.reject(error)))

const inside = (root: string, path: string) => !relative(root, path).startsWith('..')

const findPackage = async (appRoot: string, from: string, name: string): Promise<string | undefined> => {
  for (let dir = from; inside(appRoot, dir); dir = dirname(dir)) {
    const found = await realpath(join(dir, 'node_modules', name)).catch(() => undefined)
    if (found) return found
    if (dir === dirname(dir)) break
  }
  return undefined
}

const current = async (path: string) => {
  const info = await lstat(path).catch(() => undefined)
  if (!info) return { missing: true }
  if (!info.isSymbolicLink()) return { missing: false, owned: true }
  return { missing: false, target: await readlink(path).catch(() => '') }
}

const linkTo = async (path: string, target: string) => {
  const found = await current(path)
  if (found.owned || found.target === target) return
  if (!found.missing) await removeLink(path)
  await mkdir(dirname(path), { recursive: true })
  await symlink(target, path, windows ? 'junction' : 'dir')
}

export const unlinkDependencies = async (copy: string) => {
  const manifest = await readManifest(copy)
  for (const name of manifest?.dependencies ?? []) {
    const path = join(copy, 'node_modules', name)
    if ((await current(path)).target !== undefined) await removeLink(path)
  }
}

export const linkDependencies = async (appRoot: string, builtin: string, copy: string) => {
  const manifest = await readManifest(copy)
  for (const name of manifest?.dependencies ?? []) {
    const target = await findPackage(appRoot, builtin, name)
    if (target) await linkTo(join(copy, 'node_modules', name), target)
  }
}

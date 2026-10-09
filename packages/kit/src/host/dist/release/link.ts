import { lstat, mkdir, readlink, realpath, rmdir, stat, symlink, unlink } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { isLinkEntry } from './manifest'

const windows = process.platform === 'win32'

const isInside = (root: string, path: string) => {
  const rel = relative(root, path)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

const removeLink = async (path: string) => {
  try {
    await unlink(path)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (!windows || (code !== 'EPERM' && code !== 'EISDIR')) throw error
    await rmdir(path)
  }
}

const linkValue = (path: string, target: string) => (windows ? target : relative(dirname(path), target))

const clearPath = async (link: string, path: string, value: string) => {
  const found = await lstat(path).catch(() => undefined)
  if (!found) return true
  if (!found.isSymbolicLink()) throw new Error(`${link} is in the way of a sand package link`)
  if (!windows && (await readlink(path)) === value) return false
  await removeLink(path)
  return true
}

const createLink = async (root: string, link: string, target: string) => {
  if (!isLinkEntry(link, target)) throw new Error(`bad package link ${link} -> ${target}`)
  const path = resolve(root, link)
  const targetPath = resolve(root, target)
  if (!isInside(root, path) || !isInside(root, targetPath)) throw new Error(`package link ${link} leaves the sand folder`)
  if (!(await stat(targetPath).catch(() => undefined))?.isDirectory()) throw new Error(`${target} is missing`)
  await mkdir(dirname(path), { recursive: true })
  if (!isInside(await realpath(root), await realpath(dirname(path)))) throw new Error(`package link ${link} leaves the sand folder`)
  const value = linkValue(path, targetPath)
  if (await clearPath(link, path, value)) await symlink(value, path, windows ? 'junction' : 'dir')
}

export const createLinks = async (dir: string, links: Record<string, string>) => {
  const root = resolve(dir)
  for (const [link, target] of Object.entries(links)) await createLink(root, link, target)
}

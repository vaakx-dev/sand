import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { type AppFile, hashFiles } from '../build'

export const modulesFolder = 'node_modules'

export const releaseDamaged = 'the sand download is damaged; run the command again'
export const releaseTooOld = 'this sand download is too old to install; use a newer release'

const linkName = /^node_modules\/(@[A-Za-z0-9._-]+\/)?[A-Za-z0-9._-]+$/
const linkTarget = /^(apps|packages|plugins)(\/[A-Za-z0-9._-]+){1,3}$/

const badSegment = (segment: string) => !segment || segment.startsWith('.')

export const isModulePath = (path: string) => {
  if (path.includes('\\') || path.startsWith('/') || /^[a-zA-Z]:/.test(path)) return false
  const segments = path.split('/')
  if (segments.length < 3 || segments[0] !== modulesFolder) return false
  return !segments.some(badSegment) && !segments.slice(1).includes(modulesFolder)
}

export const isLinkEntry = (link: string, target: string) =>
  linkName.test(link) &&
  linkTarget.test(target) &&
  !link.split('/').some(badSegment) &&
  !target.split('/').some(badSegment)

const byPath = (a: AppFile, b: AppFile) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)

export const moduleHash = (files: AppFile[]) => hashFiles([...files].sort(byPath))

const walk = async (folder: string, path: string, skip: Set<string>, found: { path: string; file: string }[]) => {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const child = `${path}/${entry.name}`
    if (entry.name.startsWith('.') || entry.isSymbolicLink() || skip.has(child)) continue
    const file = join(folder, entry.name)
    if (entry.isDirectory()) await walk(file, child, skip, found)
    else if (entry.isFile()) found.push({ path: child, file })
  }
}

export const hashModules = async (root: string, skip: Set<string>) => {
  const found: { path: string; file: string }[] = []
  await walk(join(root, modulesFolder), modulesFolder, skip, found)
  const files = await Promise.all(found.map(async ({ path, file }) => ({ path, bytes: await Bun.file(file).bytes() })))
  return moduleHash(files)
}

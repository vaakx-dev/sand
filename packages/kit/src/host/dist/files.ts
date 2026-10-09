import { lstat, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

export const appFolders = ['apps', 'packages', 'plugins']
export const appTopFiles = ['package.json', 'bun.lock', 'tsconfig.json']
export const buildStamp = 'sand-build.json'

const skipped = (name: string) => !name || name.startsWith('.') || name === 'node_modules'

export const isAppPath = (path: string) => {
  if (appTopFiles.includes(path)) return true
  if (path.includes('\\') || path.startsWith('/') || /^[a-zA-Z]:/.test(path)) return false
  const segments = path.split('/')
  return segments.length > 1 && appFolders.includes(segments[0]!) && !segments.some(skipped)
}

interface AppScan {
  files: { path: string; file: string }[]
  latest: number
}

const walk = async (folder: string, path: string, scan: AppScan) => {
  scan.latest = Math.max(scan.latest, Math.floor((await stat(folder)).mtimeMs))
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (skipped(entry.name)) continue
    const file = join(folder, entry.name)
    const child = `${path}/${entry.name}`
    if (entry.isDirectory()) await walk(file, child, scan)
    else if (entry.isFile()) {
      scan.latest = Math.max(scan.latest, Math.floor((await stat(file)).mtimeMs))
      scan.files.push({ path: child, file })
    }
  }
}

const topFile = async (root: string, name: string) => {
  const file = join(root, name)
  const info = await lstat(file).catch(() => undefined)
  return info?.isFile() ? { file, mtime: Math.floor(info.mtimeMs) } : undefined
}

interface ModuleFile {
  path: string
  file: string
}

const walkModule = async (folder: string, path: string, found: ModuleFile[]) => {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (skipped(entry.name)) continue
    const file = join(folder, entry.name)
    const child = `${path}/${entry.name}`
    if (entry.isDirectory()) await walkModule(file, child, found)
    else if (entry.isFile() && !entry.name.endsWith('.map')) found.push({ path: child, file })
  }
}

export const moduleFiles = async (deps: { name: string; dir: string }[]): Promise<ModuleFile[]> => {
  const found: ModuleFile[] = []
  for (const { name, dir } of deps) await walkModule(dir, `node_modules/${name}`, found)
  return found.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

export const scanApp = async (root: string): Promise<AppScan> => {
  const scan: AppScan = { files: [], latest: 0 }
  for (const name of appFolders) {
    const folder = join(root, name)
    if ((await lstat(folder).catch(() => undefined))?.isDirectory()) await walk(folder, name, scan)
  }
  for (const name of appTopFiles) {
    const found = await topFile(root, name)
    if (!found) continue
    scan.latest = Math.max(scan.latest, found.mtime)
    scan.files.push({ path: name, file: found.file })
  }
  scan.files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return scan
}

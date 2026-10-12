import { lstat, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { limited } from '@sand/kit'

const timeout = 4000

const folderBytes = async (folder: string) => {
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
  const files = entries.filter(entry => entry.isFile()).map(entry => join(folder, entry.name))
  const sizes = await Promise.all(files.map(file => lstat(file).then(stats => stats.size, () => 0)))
  return {
    bytes: sizes.reduce((sum, size) => sum + size, 0),
    folders: entries.filter(entry => entry.isDirectory()).map(entry => join(folder, entry.name)),
  }
}

const walkBytes = async (path: string) => {
  const top = await lstat(path).catch(() => undefined)
  if (!top?.isDirectory()) return top?.isFile() ? top.size : 0
  const deadline = Date.now() + timeout
  const run = limited(32)
  const visit = async (folder: string): Promise<number> => {
    if (Date.now() > deadline) return 0
    const found = await run(() => folderBytes(folder))
    const inner = await Promise.all(found.folders.map(visit))
    return inner.reduce((sum, bytes) => sum + bytes, found.bytes)
  }
  return visit(path)
}

const duBytes = async (path: string) => {
  const du = Bun.spawn(['du', '-sk', '--', path], { stdin: 'ignore', stdout: 'pipe', stderr: 'ignore', timeout, windowsHide: true })
  const [text] = await Promise.all([new Response(du.stdout).text(), du.exited])
  const kilobytes = Number(text.split('\t')[0])
  return Number.isFinite(kilobytes) ? kilobytes * 1024 : 0
}

export const diskBytes = (path: string) => (process.platform === 'win32' ? walkBytes(path) : duBytes(path))

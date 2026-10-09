import { lstat, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const walkBytes = async (path: string, timeout: number) => {
  const top = await lstat(path).catch(() => undefined)
  if (!top?.isDirectory()) return top?.isFile() ? top.size : 0
  const deadline = Date.now() + timeout
  const folders = [path]
  let total = 0
  while (folders.length && Date.now() < deadline) {
    const folder = folders.pop()!
    const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
    const files = entries.filter(entry => entry.isFile()).map(entry => join(folder, entry.name))
    for (const entry of entries) if (entry.isDirectory()) folders.push(join(folder, entry.name))
    const sizes = await Promise.all(files.map(file => lstat(file).then(stats => stats.size, () => 0)))
    for (const size of sizes) total += size
  }
  return total
}

const duBytes = async (path: string, timeout: number) => {
  const du = Bun.spawn(['du', '-sk', '--', path], { stdin: 'ignore', stdout: 'pipe', stderr: 'ignore', timeout, windowsHide: true })
  const [text] = await Promise.all([new Response(du.stdout).text(), du.exited])
  const kilobytes = Number(text.split('\t')[0])
  return Number.isFinite(kilobytes) ? kilobytes * 1024 : 0
}

export const diskBytes = (path: string, timeout = 4000) => (process.platform === 'win32' ? walkBytes(path, timeout) : duBytes(path, timeout))

import { resolve } from 'node:path'
import { isDirectory } from '../files'
import { lines, ripgrep, scope } from './ripgrep'

const git = /(^|[\\/])\.git([\\/]|$)/
const ignored = /(^|[\\/])(node_modules|\.git)([\\/]|$)/
const special = /[*?[\]{}!\\]/
const maxListed = 200_000

const listed = (cwd: string, includeIgnored?: boolean, signal?: AbortSignal) =>
  ripgrep
    ? lines(ripgrep, ['--files', ...scope(includeIgnored)], cwd, signal)
    : new Bun.Glob('**/*').scan({ cwd, onlyFiles: true, dot: true, followSymlinks: includeIgnored })

const slashes = (path: string) => (process.platform === 'win32' ? path.replaceAll('\\', '/') : path)

const split = (pattern: string) => {
  const parts = slashes(pattern).replace(/^(\.\/)+/, '').split('/')
  const first = parts.findIndex(part => special.test(part))
  const at = first === -1 ? parts.length - 1 : first
  const base = at === 1 && parts[0] === '' ? '/' : parts.slice(0, at).join('/')
  return { base, rest: parts.slice(at).join('/') }
}

export async function* walk(pattern: string, cwd: string, includeIgnored?: boolean, signal?: AbortSignal) {
  const { base, rest } = split(pattern)
  const skip = includeIgnored ? git : ignored
  if (skip.test(base)) return
  const root = resolve(cwd, base)
  if (!(await isDirectory(root))) return
  const glob = new Bun.Glob(rest)
  let count = 0
  for await (const listedPath of listed(root, includeIgnored, signal)) {
    signal?.throwIfAborted()
    if (++count > maxListed) throw new Error(`Stopped after listing ${maxListed} files. Use a narrower path or pattern.`)
    const path = slashes(listedPath)
    if (!skip.test(path) && glob.match(path)) yield base ? `${base.replace(/\/$/, '')}/${path}` : path
  }
}

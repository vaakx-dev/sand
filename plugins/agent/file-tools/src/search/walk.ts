import { resolve } from 'node:path'
import { lines, scope } from './ripgrep'

interface Walk {
  binary: string
  pattern: string
  cwd: string
  includeIgnored?: boolean
  signal?: AbortSignal
}

const git = /(^|[\\/])\.git([\\/]|$)/
const ignored = /(^|[\\/])(node_modules|\.git)([\\/]|$)/
const special = /[*?[\]{}!\\]/
const maxListed = 200_000

const slashes = (path: string) => (process.platform === 'win32' ? path.replaceAll('\\', '/') : path)

const split = (pattern: string) => {
  const parts = slashes(pattern).replace(/^(\.\/)+/, '').split('/')
  const first = parts.findIndex(part => special.test(part))
  const at = first === -1 ? parts.length - 1 : first
  const base = at === 1 && parts[0] === '' ? '/' : parts.slice(0, at).join('/')
  return { base, rest: parts.slice(at).join('/') }
}

async function* walk({ binary, pattern, cwd, includeIgnored, signal }: Walk) {
  const { base, rest } = split(pattern)
  const skip = includeIgnored ? git : ignored
  if (skip.test(base)) return
  const glob = new Bun.Glob(rest)
  let count = 0
  for await (const listedPath of lines(binary, ['--files', ...scope(includeIgnored)], resolve(cwd, base), signal)) {
    signal?.throwIfAborted()
    if (++count > maxListed) throw new Error(`Stopped after listing ${maxListed} files. Use a narrower path or pattern.`)
    const path = slashes(listedPath)
    if (!skip.test(path) && glob.match(path)) yield base ? `${base.replace(/\/$/, '')}/${path}` : path
  }
}

export { walk }

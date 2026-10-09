import { lines, ripgrep, scope } from './ripgrep'

const git = /(^|[\\/])\.git([\\/]|$)/
const ignored = /(^|[\\/])(node_modules|\.git)([\\/]|$)/

const listed = (cwd: string, includeIgnored?: boolean, signal?: AbortSignal) =>
  ripgrep
    ? lines(ripgrep, ['--files', ...scope(includeIgnored)], cwd, signal)
    : new Bun.Glob('**/*').scan({ cwd, onlyFiles: true, dot: true, followSymlinks: includeIgnored })

const slashes = (path: string) => (process.platform === 'win32' ? path.replaceAll('\\', '/') : path)

export async function* walk(pattern: string, cwd: string, includeIgnored?: boolean, signal?: AbortSignal) {
  const glob = new Bun.Glob(pattern)
  const skip = includeIgnored ? git : ignored
  for await (const listedPath of listed(cwd, includeIgnored, signal)) {
    const path = slashes(listedPath)
    if (!skip.test(path) && glob.match(path)) yield path
  }
}

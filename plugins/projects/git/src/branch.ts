import { existsSync } from 'node:fs'

const freshMs = 5000

const cache = new Map<string, { at: number; branch?: string }>()

const read = async (cwd: string) => {
  const git = Bun.spawn(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { cwd, stdin: 'ignore', stdout: 'pipe', stderr: 'ignore', windowsHide: true })
  const [output, code] = await Promise.all([new Response(git.stdout).text(), git.exited])
  return code === 0 && output.trim() ? output.trim() : undefined
}

export const branch = async (cwd: string) => {
  if (!cwd || !existsSync(cwd)) return undefined
  const cached = cache.get(cwd)
  if (cached && Date.now() - cached.at < freshMs) return cached.branch
  const found = await read(cwd).catch(() => undefined)
  cache.set(cwd, { at: Date.now(), branch: found })
  return found
}

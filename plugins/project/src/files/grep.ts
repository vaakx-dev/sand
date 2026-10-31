import type { GitRunner } from '@sand/git/contract'
import type { GrepMatch } from '../contract'

const limit = 100

const inRepo = ['grep', '-n', '-I', '-F', '-i', '--untracked', '-e']
const plain = ['grep', '-r', '-n', '-I', '-F', '-i', '--exclude-dir=node_modules', '--exclude-dir=.git', '-e']

const parse = (line: string): GrepMatch | undefined => {
  const match = /^(.+?):(\d+):(.*)$/.exec(line.replace(/\r$/, ''))
  if (!match) return undefined
  const [, path = '', number, text = ''] = match
  return { path: path.replace(/^\.\//, ''), line: Number(number), text: text.trim().slice(0, 200) }
}

const start = (command: string[], cwd: string) => {
  try {
    return Bun.spawn(command, { cwd, stdin: 'ignore', stdout: 'pipe', stderr: 'ignore', windowsHide: true })
  } catch {
    return undefined
  }
}

const grepPlain = async (cwd: string, query: string) => {
  const child = start([...plain, query, '.'], cwd)
  if (!child) return []
  const found: GrepMatch[] = []
  const decoder = new TextDecoder()
  let rest = ''
  for await (const chunk of child.stdout) {
    const lines = (rest + decoder.decode(chunk, { stream: true })).split('\n')
    rest = lines.pop() ?? ''
    found.push(...lines.flatMap(line => parse(line) ?? []))
    if (found.length >= limit) break
  }
  child.kill()
  await child.exited
  return found.slice(0, limit)
}

const grepRepo = (git: GitRunner, cwd: string, query: string) =>
  git.lines(cwd, [...inRepo, query], limit, { read: true }).then(
    ({ code, lines }) => ({ code, found: lines.flatMap(line => parse(line) ?? []) }),
    () => ({ code: -1, found: [] }),
  )

export const grepFiles = async (git: GitRunner | undefined, cwd: string, query: string) => {
  if (!query.trim()) return []
  if (!git) return grepPlain(cwd, query)
  const repo = await grepRepo(git, cwd, query)
  if (repo.found.length || repo.code === 1 || !Bun.which('grep')) return repo.found
  return grepPlain(cwd, query)
}

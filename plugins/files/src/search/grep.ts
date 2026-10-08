import type { GrepMatch } from '@sand/protocol'

const limit = 100

const inRepo = ['git', 'grep', '-n', '-I', '-F', '-i', '--untracked', '-e']
const plain = ['grep', '-r', '-n', '-I', '-F', '-i', '--exclude-dir=node_modules', '--exclude-dir=.git', '-e']

const parse = (line: string): GrepMatch | undefined => {
  const match = /^(.+?):(\d+):(.*)$/.exec(line)
  return match ? { path: match[1]!.replace(/^\.\//, ''), line: Number(match[2]), text: match[3]!.trim().slice(0, 200) } : undefined
}

const run = async (command: string[], cwd: string) => {
  const child = Bun.spawn(command, { cwd, stdin: 'ignore', stdout: 'pipe', stderr: 'ignore' })
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
  return { found: found.slice(0, limit), code: await child.exited }
}

export const grepFiles = async (cwd: string, query: string) => {
  if (!query.trim()) return []
  const repo = await run([...inRepo, query], cwd)
  if (repo.found.length || repo.code === 1) return repo.found
  return (await run([...plain, query, '.'], cwd)).found
}

import type { GitRunner } from '@sand/git-runner/contract'
import { join } from 'node:path'
import type { GrepMatch } from '../contract'
import { walkFiles } from './walk'

const limit = 100
const fileLimit = 20_000
const maxBytes = 1_000_000
const sniffBytes = 8000
const batch = 32

const inRepo = ['grep', '-n', '-I', '-F', '-i', '--untracked', '-e']

const parse = (line: string): GrepMatch | undefined => {
  const match = /^(.+?):(\d+):(.*)$/.exec(line.replace(/\r$/, ''))
  if (!match) return undefined
  const [, path = '', number, text = ''] = match
  return { path, line: Number(number), text: text.trim().slice(0, 200) }
}

const textOf = async (full: string) => {
  const file = Bun.file(full)
  if (file.size > maxBytes) return undefined
  const bytes = await file.bytes().catch(() => undefined)
  if (!bytes || bytes.subarray(0, sniffBytes).includes(0)) return undefined
  return new TextDecoder().decode(bytes)
}

const matchesIn = async (cwd: string, path: string, needle: string): Promise<GrepMatch[]> => {
  const text = await textOf(join(cwd, path))
  if (!text?.toLowerCase().includes(needle)) return []
  return text.split(/\r?\n/).flatMap((line, index) => (line.toLowerCase().includes(needle) ? [{ path, line: index + 1, text: line.trim().slice(0, 200) }] : []))
}

const grepWalk = async (cwd: string, query: string) => {
  const needle = query.toLowerCase()
  const paths = await walkFiles(cwd, fileLimit)
  const found: GrepMatch[] = []
  for (let start = 0; start < paths.length && found.length < limit; start += batch) {
    const chunk = paths.slice(start, start + batch)
    found.push(...(await Promise.all(chunk.map(path => matchesIn(cwd, path, needle)))).flat())
  }
  return found.slice(0, limit)
}

const grepRepo = (git: GitRunner, cwd: string, query: string) =>
  git.lines(cwd, [...inRepo, query], limit, { read: true }).then(
    ({ code, lines }) => ({ code, found: lines.flatMap(line => parse(line) ?? []) }),
    () => ({ code: -1, found: [] }),
  )

export const grepFiles = async (git: GitRunner | undefined, cwd: string, query: string) => {
  if (!query.trim()) return []
  if (!git) return grepWalk(cwd, query)
  const repo = await grepRepo(git, cwd, query)
  if (repo.found.length || repo.code === 1) return repo.found
  return grepWalk(cwd, query)
}

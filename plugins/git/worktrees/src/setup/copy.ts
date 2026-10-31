import { isFolder, isWithin } from '@sand/util/fs'
import { existsSync } from 'node:fs'
import { cp } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import type { StepOutcome } from './outcome'

const globChars = /[*?[{]/
const mostListed = 20

const matches = async (main: string, pattern: string) => {
  const found = await Array.fromAsync(new Bun.Glob(pattern).scan({ cwd: main, dot: true, onlyFiles: true }))
  return found.filter(path => isWithin(resolve(main, path), main))
}

const sources = async (main: string, entry: string) => {
  if (globChars.test(entry)) return matches(main, entry)
  return existsSync(join(main, entry)) ? [entry] : []
}

const keepsOwn = async (path: string) => existsSync(path) && !(await isFolder(path))

export const copyEntry = async (main: string, target: string, entry: string): Promise<StepOutcome> => {
  if (isAbsolute(entry) || !isWithin(resolve(main, entry), main)) return { state: 'fail', output: `${entry} is outside the main checkout.` }
  const paths = await sources(main, entry)
  if (!paths.length) return { state: 'skip', output: `Nothing in the main checkout matches ${entry}.` }
  const kept: string[] = []
  for (const path of paths) {
    const to = join(target, path)
    if (await keepsOwn(to)) kept.push(path)
    else await cp(join(main, path), to, { recursive: true, force: false, errorOnExist: false })
  }
  const lines = [`Copied ${paths.length - kept.length} of ${paths.length}.`, ...kept.map(path => `Kept the worktree's own ${path}.`)]
  return { state: 'ok', output: lines.slice(0, mostListed).join('\n') }
}

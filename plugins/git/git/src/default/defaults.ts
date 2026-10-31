import { normalize } from 'node:path'
import type { GitBase } from '../contract'
import { gitMaybe } from '../run/run'
import { readDefaultBranch } from '../status/default-branch'

export interface Defaults {
  branch(cwd: string): Promise<string | undefined>
  base(cwd: string): Promise<GitBase | undefined>
  forget(commonDir: string): void
  clear(): void
}

const commonDirOf = async (cwd: string) => {
  const out = await gitMaybe(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir'], { read: true }).catch(() => undefined)
  return out ? normalize(out) : undefined
}

const candidates = (branch: string) => [
  { ref: `refs/remotes/origin/${branch}`, label: `origin/${branch}` },
  { ref: `refs/heads/${branch}`, label: branch },
]

const readBase = async (cwd: string, branch: string): Promise<GitBase | undefined> => {
  const choices = candidates(branch)
  const out = await gitMaybe(cwd, ['for-each-ref', '--format=%(refname) %(objectname)', ...choices.map(choice => choice.ref)], { read: true })
  const commits = new Map(out?.split(/\r?\n/).map(line => line.split(' ') as [string, string | undefined]))
  for (const { ref, label } of choices) {
    const commit = commits.get(ref)
    if (commit) return { branch, ref, label, commit }
  }
  return undefined
}

export const createDefaults = (): Defaults => {
  const known = new Map<string, Promise<string | undefined>>()

  const branchIn = (commonDir: string, cwd: string) => {
    const cached = known.get(commonDir)
    if (cached) return cached
    const reading = readDefaultBranch(cwd).catch(error => {
      if (known.get(commonDir) === reading) known.delete(commonDir)
      throw error
    })
    known.set(commonDir, reading)
    return reading
  }

  const branch = async (cwd: string) => {
    const commonDir = await commonDirOf(cwd)
    return commonDir ? branchIn(commonDir, cwd) : undefined
  }

  return {
    branch,
    async base(cwd) {
      const name = await branch(cwd)
      return name ? readBase(cwd, name) : undefined
    },
    forget: commonDir => void known.delete(commonDir),
    clear: () => known.clear(),
  }
}

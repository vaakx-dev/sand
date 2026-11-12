import type { GitBase, GitLayout } from '../contract'
import { gitMaybe } from '@sand/git-runner/contract'
import { readDefaultBranch } from '../status/default-branch'
import type { Layouts } from '../status/layout'

export interface Defaults {
  branch(cwd: string): Promise<string | undefined>
  branchOf(layout: GitLayout): Promise<string | undefined>
  base(cwd: string): Promise<GitBase | undefined>
  forget(commonDir: string): void
  clear(): void
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

export const createDefaults = (layouts: Layouts): Defaults => {
  const known = new Map<string, Promise<string | undefined>>()

  const branchOf = ({ commonDir, root }: GitLayout) => {
    const cached = known.get(commonDir)
    if (cached) return cached
    const drop = () => {
      if (known.get(commonDir) === reading) known.delete(commonDir)
    }
    const reading = readDefaultBranch(root).then(
      found => {
        if (!found) drop()
        return found
      },
      (error: unknown) => {
        drop()
        throw error
      },
    )
    known.set(commonDir, reading)
    return reading
  }

  const branch = async (cwd: string) => {
    const layout = await layouts.read(cwd)
    return layout ? branchOf(layout) : undefined
  }

  return {
    branch,
    branchOf,
    async base(cwd) {
      const name = await branch(cwd)
      return name ? readBase(cwd, name) : undefined
    },
    forget: commonDir => void known.delete(commonDir),
    clear: () => known.clear(),
  }
}

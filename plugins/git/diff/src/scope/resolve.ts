import type { GitRunner } from '@sand/git/contract'
import type { DiffScope } from '../contract'
import { commitOf, type DiffGit, emptyTree } from '../git'
import { type Repo, readRepo } from './repo'

export interface Range {
  repo: Repo
  from: string
  to?: string
  base?: string
  baseLabel?: string
}

const uncommitted = async (git: GitRunner, repo: Repo): Promise<Range> =>
  repo.head ? { repo, from: repo.head, base: repo.head } : { repo, from: await emptyTree(git, repo.root) }

const ofCommit = async (git: GitRunner, repo: Repo, revision: string): Promise<Range> => {
  const commit = await commitOf(git, repo.root, revision)
  if (!commit) throw new Error(`Couldn't find commit ${revision}.`)
  const parent = await commitOf(git, repo.root, `${commit}^1`)
  return parent ? { repo, from: parent, to: commit, base: parent } : { repo, from: await emptyTree(git, repo.root), to: commit }
}

const forkFrom = (git: GitRunner, repo: Repo, head: string, commit: string) => git.maybe(repo.root, ['merge-base', head, commit], { read: true })

const ofNamed = async (git: GitRunner, repo: Repo, head: string, name: string): Promise<Range | undefined> => {
  const commit = await commitOf(git, repo.root, name)
  if (!commit) throw new Error(`Couldn't find ${name} in this repository.`)
  const fork = await forkFrom(git, repo, head, commit)
  return fork ? { repo, from: fork, base: fork, baseLabel: name } : undefined
}

const ofDefault = async ({ git, repos }: DiffGit, repo: Repo, head: string): Promise<Range | undefined> => {
  const base = await repos.base(repo.root)
  if (!base) return undefined
  const fork = await forkFrom(git, repo, head, base.commit)
  if (!fork || (repo.branch === base.branch && fork === head)) return undefined
  return { repo, from: fork, base: fork, baseLabel: base.label }
}

const ofBranch = (tools: DiffGit, repo: Repo, name?: string) => {
  if (!repo.head) return undefined
  return name ? ofNamed(tools.git, repo, repo.head, name) : ofDefault(tools, repo, repo.head)
}

export const resolveScope = async (tools: DiffGit, cwd: string, scope: DiffScope): Promise<Range> => {
  const { git } = tools
  const repo = await readRepo(git, cwd)
  if (scope.kind === 'commit') return ofCommit(git, repo, scope.commit)
  if (scope.kind === 'all') return (await ofBranch(tools, repo, scope.base)) ?? uncommitted(git, repo)
  return uncommitted(git, repo)
}

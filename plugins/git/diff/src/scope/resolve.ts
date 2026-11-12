import type { GitRunner } from '@sand/git-runner/contract'
import type { DiffScope } from '../contract'
import { commitOf, type DiffGit, emptyTree, isRevision, treeOf } from '../git'

export interface Range {
  root: string
  from: string
  to?: string
  base?: string
  baseLabel?: string
}

const revision = (name: string) => {
  if (!isRevision(name)) throw new Error(`${name} isn't a commit name.`)
  return name
}

const fromHead = async (git: GitRunner, root: string, head: string | undefined): Promise<Range> =>
  head ? { root, from: head, base: head } : { root, from: await emptyTree(git, root) }

const uncommitted = async (git: GitRunner, root: string) => fromHead(git, root, await commitOf(git, root, 'HEAD'))

const since = (root: string, commit: string): Range => ({ root, from: revision(commit), base: commit })

const ofCommit = async (git: GitRunner, root: string, name: string): Promise<Range> => {
  const [commit, parent] = await git.commits(root, [revision(name), `${name}^1`])
  if (!commit) throw new Error(`Couldn't find commit ${name}.`)
  return parent ? { root, from: parent, to: commit, base: parent } : { root, from: await emptyTree(git, root), to: commit }
}

const treeish = async (git: GitRunner, root: string, name: string) => {
  const found = (await commitOf(git, root, name)) ?? (await treeOf(git, root, name))
  if (!found) throw new Error(`Couldn't find ${name} in this repository.`)
  return found
}

const ofRange = async (git: GitRunner, root: string, from: string, to: string): Promise<Range> => {
  const [start, end] = await Promise.all([treeish(git, root, from), treeish(git, root, to)])
  return { root, from: start, to: end, base: start }
}

const forkFrom = (git: GitRunner, root: string, head: string, commit: string) => git.maybe(root, ['merge-base', head, commit], { read: true })

const ofNamed = async (git: GitRunner, root: string, name: string): Promise<Range> => {
  const [head, commit] = await git.commits(root, ['HEAD', revision(name)])
  if (!head) return fromHead(git, root, head)
  if (!commit) throw new Error(`Couldn't find ${name} in this repository.`)
  const fork = await forkFrom(git, root, head, commit)
  return fork ? { root, from: fork, base: fork, baseLabel: name } : fromHead(git, root, head)
}

const currentBranch = async (git: GitRunner, root: string) => (await git.maybe(root, ['symbolic-ref', '-q', '--short', 'HEAD'], { read: true })) || undefined

const ofDefault = async ({ git, repos }: DiffGit, root: string): Promise<Range> => {
  const [head, base] = await Promise.all([commitOf(git, root, 'HEAD'), repos.base(root)])
  const fork = head && base && (await forkFrom(git, root, head, base.commit))
  if (!fork || !base) return fromHead(git, root, head)
  if (fork === head && (await currentBranch(git, root)) === base.branch) return fromHead(git, root, head)
  return { root, from: fork, base: fork, baseLabel: base.label }
}

const rootOf = async ({ repos }: DiffGit, cwd: string) => {
  const layout = await repos.layout(cwd)
  if (!layout) throw new Error("This folder isn't a git repository.")
  return layout.root
}

export const resolveScope = async (tools: DiffGit, cwd: string, scope: DiffScope): Promise<Range> => {
  const { git } = tools
  const root = await rootOf(tools, cwd)
  switch (scope.kind) {
    case 'since':
      return since(root, scope.commit)
    case 'commit':
      return ofCommit(git, root, scope.commit)
    case 'range':
      return ofRange(git, root, scope.from, scope.to)
    case 'all':
      return scope.base ? ofNamed(git, root, scope.base) : ofDefault(tools, root)
    case 'uncommitted':
      return uncommitted(git, root)
  }
}

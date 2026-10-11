import type { Names } from '@sand/titles/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import { gitMaybe, gitOk } from '@sand/kit/git'
import { isUnnamed } from '../contract'
import { branchExists, repoOf, type Repo } from '../git/repo'
import { firstFree } from '../place'
import { branchFor } from '../slug'
import { openSession, sessionsIn, type Ops } from './context'

const pushed = async (root: string) => Boolean(await gitMaybe(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']))

const checkName = async (root: string, name: string) => {
  if (!(await gitMaybe(root, ['check-ref-format', '--branch', name]))) throw new Error(`${name} is not a valid branch name`)
  if (await branchExists(root, name)) throw new Error(`A branch named ${name} already exists`)
}

export const createNaming = (ops: Ops, names: () => Names | undefined) => {
  const suggested = async (session: Session) => {
    const name = (await names()?.suggest(session).catch(() => undefined)) ?? session.title
    return name ? branchFor(name) : undefined
  }

  const renameBranch = async (repo: Repo, branch: string, session: Session | undefined, wanted?: string) => {
    if (await pushed(repo.root)) throw new Error('This branch is pushed, so it keeps its name')
    const target = wanted ?? (session && (await suggested(session)))
    if (!target || target === branch) return
    const next = wanted ?? (await firstFree(target, async name => !(await branchExists(repo.root, name))))
    await gitOk(repo.root, ['branch', '-m', branch, next])
    ops.changed(repo.main)
  }

  const sandBranchOf = async (session: Session) => {
    const repo = await repoOf(session.cwd)
    return repo?.linked && repo.branch?.startsWith('sand/') ? { repo, branch: repo.branch } : undefined
  }

  const latestIn = (root: string) => {
    const [latest] = sessionsIn(ops, root)
      .filter(summary => summary.kind === 'main')
      .sort((a, b) => b.updated - a.updated)
    return latest && (ops.sessions.open(latest.id) ?? undefined)
  }

  return {
    async nameAt(path: unknown, wanted: unknown) {
      const repo = await repoOf(String(path ?? ''))
      if (!repo?.linked || !repo.branch) throw new Error('That folder is not a worktree on a branch')
      const name = typeof wanted === 'string' ? wanted.trim() : ''
      if (name) await checkName(repo.root, name)
      else if (!repo.branch.startsWith('sand/')) throw new Error('Only branches sand made can get a new name by themselves')
      const session = latestIn(repo.root)
      if (!name && !session) throw new Error('No thread works there, so there is nothing to name it after')
      await renameBranch(repo, repo.branch, session, name || undefined)
    },
    async start(session: Session) {
      if (session.kind !== 'main') return
      const found = await sandBranchOf(session)
      if (found && isUnnamed(found.branch)) await renameBranch(found.repo, found.branch, session)
    },
    async rename(id: unknown) {
      const session = openSession(ops, id)
      const found = await sandBranchOf(session)
      if (found) await renameBranch(found.repo, found.branch, session)
    },
  }
}

export type Naming = ReturnType<typeof createNaming>

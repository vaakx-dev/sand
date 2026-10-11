import type { Names } from '@sand/titles/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import { samePath } from '@sand/kit/fs'
import { gitMaybe, gitOk } from '@sand/kit/git'
import { existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { isUnnamed, type RenameResult } from '../contract'
import { branchExists, repoOf, within, type Repo } from '../git/repo'
import { firstFree, locate } from '../place'
import { branchFor } from '../slug'
import { busyIn, idleIn, openSession, sessionsIn, type Ops } from './context'
import { relocate } from './relocate'

const moveTries = 4
const movePauseMs = 750

interface NameRequest {
  session?: Session
  asked: boolean
  wanted?: string
}

const pushed = async (root: string) => Boolean(await gitMaybe(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']))

const moveWorktree = async (main: string, from: string, to: string) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await gitOk(main, ['worktree', 'move', from, to])
    } catch (error) {
      if (attempt >= moveTries) throw error
      await Bun.sleep(movePauseMs)
    }
  }
}

const checkName = async (root: string, name: string) => {
  if (!(await gitMaybe(root, ['check-ref-format', '--branch', name]))) throw new Error(`${name} is not a valid branch name`)
  if (await branchExists(root, name)) throw new Error(`A branch named ${name} already exists`)
}

export const createNaming = (ops: Ops, names: () => Names | undefined) => {
  const later = new Set<string>()

  const suggested = async (session: Session) => {
    const name = (await names()?.suggest(session).catch(() => undefined)) ?? session.title
    return name ? branchFor(name) : undefined
  }

  const renameBranch = async (repo: Repo, branch: string, { session, asked, wanted }: NameRequest) => {
    if (!asked && !isUnnamed(branch)) return branch
    if (await pushed(repo.root)) {
      if (asked) throw new Error('This branch is pushed, so it keeps its name')
      return branch
    }
    const target = wanted ?? (session && (await suggested(session)))
    if (!target || target === branch) return branch
    const next = wanted ?? (await firstFree(target, async name => !(await branchExists(repo.root, name))))
    await gitOk(repo.root, ['branch', '-m', branch, next])
    return next
  }

  const moveFolder = async (repo: Repo, branch: string) => {
    const target = locate(ops.config.location, repo.main, repo.name, branch)
    if (samePath(target, repo.root) || !samePath(dirname(target), dirname(repo.root)) || existsSync(target) || busyIn(ops, repo.root)) return false
    const moved = sessionsIn(ops, repo.root)
    await moveWorktree(repo.main, repo.root, target)
    for (const summary of moved) {
      const live = ops.sessions.open(summary.id)
      if (live) relocate(live, within(repo.root, live.cwd, target), `This thread's worktree folder was renamed to match its branch ${branch}.`)
    }
    return true
  }

  const apply = async (repo: Repo, from: string, request: NameRequest) => {
    const branch = await renameBranch(repo, from, request)
    const moved = await moveFolder(repo, branch).catch(() => false)
    if (branch !== from || moved) ops.changed(repo.main)
  }

  const name = async (session: Session, asked: boolean) => {
    const repo = await repoOf(session.cwd)
    if (!repo?.linked || !repo.branch?.startsWith('sand/')) return
    if (!busyIn(ops, repo.root)) return apply(repo, repo.branch, { session, asked })
    if (asked) later.add(session.id)
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
      idleIn(ops, repo.root)
      const name = typeof wanted === 'string' ? wanted.trim() : ''
      if (name) await checkName(repo.root, name)
      else if (!repo.branch.startsWith('sand/')) throw new Error('Only branches sand made can get a new name by themselves')
      const session = latestIn(repo.root)
      if (!name && !session) throw new Error('No thread works there, so there is nothing to name it after')
      await apply(repo, repo.branch, { session, asked: true, wanted: name || undefined })
    },
    async settle(session: Session) {
      if (session.kind !== 'main') return
      await name(session, later.delete(session.id)).catch(() => {})
    },
    async rename(id: unknown): Promise<RenameResult> {
      const session = openSession(ops, id)
      await name(session, true)
      return { later: later.has(session.id) }
    },
  }
}

export type Naming = ReturnType<typeof createNaming>

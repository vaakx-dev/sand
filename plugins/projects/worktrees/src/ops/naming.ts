import type { Names } from '@sand/titles/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import { isInside } from '@sand/kit'
import { samePath } from '@sand/kit/fs'
import { existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { isUnnamed, type RenameResult } from '../contract'
import { branchExists, repoOf, within, type Repo } from '../git/repo'
import { gitMaybe, gitOk } from '../git/run'
import { locate } from '../place'
import { branchFor } from '../slug'
import { forgetMarks } from './marks'
import { relocate } from './relocate'
import { openSession, type Ops } from './types'

const pushed = async (root: string) => Boolean(await gitMaybe(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']))

const freeBranch = async (root: string, wanted: string) => {
  for (let tries = 1; tries < 100; tries++) {
    const name = tries === 1 ? wanted : `${wanted}-${tries}`
    if (!(await branchExists(root, name))) return name
  }
  throw new Error(`No free branch name for ${wanted}`)
}

const tries = 4
const pause = 750

const moveWorktree = async (main: string, from: string, to: string) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await gitOk(main, ['worktree', 'move', from, to])
    } catch (error) {
      if (attempt >= tries) throw error
      await Bun.sleep(pause)
    }
  }
}

export const createNaming = (ops: Ops, names: () => Names | undefined) => {
  const later = new Set<string>()

  const sessionsIn = (root: string) => ops.sessions.list().filter(summary => samePath(summary.cwd, root) || isInside(summary.cwd, root))
  const busy = (root: string) => sessionsIn(root).some(summary => ops.running.has(summary.id))

  const renameBranch = async (repo: Repo, session: Session, branch: string, asked: boolean) => {
    if (!asked && !isUnnamed(branch)) return branch
    if (await pushed(repo.root)) {
      if (asked) throw new Error('This branch is pushed, so it keeps its name')
      return branch
    }
    const name = (await names()?.suggest(session).catch(() => undefined)) ?? session.title
    if (!name || branchFor(name) === branch) return branch
    const next = await freeBranch(repo.root, branchFor(name))
    await gitOk(repo.root, ['branch', '-m', branch, next])
    return next
  }

  const moveFolder = async (repo: Repo, branch: string) => {
    const target = locate(ops.config.location, repo.main, repo.name, branch)
    if (samePath(target, repo.root) || !samePath(dirname(target), dirname(repo.root)) || existsSync(target) || busy(repo.root)) return false
    const moved = sessionsIn(repo.root)
    await moveWorktree(repo.main, repo.root, target)
    for (const summary of moved) {
      const live = ops.sessions.open(summary.id)
      if (live) relocate(live, within(repo.root, live.cwd, target), `This thread's worktree folder was renamed to match its branch ${branch}.`)
    }
    return true
  }

  const name = async (session: Session, asked: boolean) => {
    const repo = await repoOf(session.cwd)
    if (!repo?.linked || !repo.branch?.startsWith('sand/')) return
    if (busy(repo.root)) {
      if (asked) later.add(session.id)
      return
    }
    const branch = await renameBranch(repo, session, repo.branch, asked)
    const moved = await moveFolder(repo, branch).catch(() => false)
    if (branch === repo.branch && !moved) return
    forgetMarks()
    ops.changed(repo.main)
  }

  return {
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

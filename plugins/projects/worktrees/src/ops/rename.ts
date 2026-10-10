import type { Session } from '@sand/sessions-sqlite/contract'
import { isUnnamed } from '../contract'
import { branchExists, repoOf } from '../git/repo'
import { gitMaybe, gitOk } from '../git/run'
import { namedBySand } from '../git/worktree'
import { branchFor, fromTitle } from '../slug'
import { forgetMarks } from './marks'
import type { Ops } from './types'

const freeName = async (root: string, wanted: string) => {
  for (let tries = 1; tries < 100; tries++) {
    const name = tries === 1 ? wanted : `${wanted}-${tries}`
    if (!(await branchExists(root, name))) return name
  }
  throw new Error(`No free branch name for ${wanted}`)
}

const pushed = async (root: string) => Boolean(await gitMaybe(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']))

const renameBranch = async (ops: Ops, session: Session) => {
  const title = session.title
  const repo = await repoOf(session.cwd)
  const branch = repo?.branch
  if (!title || !repo?.linked || !branch || fromTitle(branch, title)) return
  if (!isUnnamed(branch) && !(await namedBySand(repo.root, branch))) return
  if (await pushed(repo.root)) return
  await gitOk(repo.root, ['branch', '-m', branch, await freeName(repo.root, branchFor(title))])
  forgetMarks()
  ops.changed(repo.main)
}

export const createRenamer = (ops: Ops) => {
  const titles = new Map<string, string | null>()
  const queue = new Map<string, Promise<void>>()
  return (session: Session) => {
    if (session.kind !== 'main' || titles.get(session.id) === session.title) return
    titles.set(session.id, session.title)
    const next = (queue.get(session.id) ?? Promise.resolve()).then(() => renameBranch(ops, session)).catch(() => {})
    queue.set(session.id, next)
  }
}

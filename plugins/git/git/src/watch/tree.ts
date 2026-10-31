import type { WireHost } from '@sand/host-hub/contract'
import { joinDisposers } from '@sand/util'
import type { Watcher } from '@sand/watch/contract'
import { existsSync } from 'node:fs'
import { type GitLocal, gitLocalChange, type GitRemote, gitRemoteChange, type GitStatus } from '../contract'
import { GitError } from '../run/error'
import type { Layout } from '../status/layout'
import { readLocal } from '../status/local'
import { type FetchInfo, readRemote } from '../status/remote'
import { debounceMs, inGitDir, inWorkingTree } from './filters'
import { serialized } from './serial'

export interface TreeDeps {
  watcher: Watcher
  broadcast: WireHost['broadcast']
  fetched(commonDir: string): FetchInfo
  report(error: unknown): void
}

export interface Tree {
  readonly layout: Layout
  readonly cwds: Map<string, string>
  readonly ready: Promise<void>
  status(cwd: string, prefix: string): GitStatus
  stale(): boolean
  update(remote?: boolean, force?: boolean): Promise<void>
  stop(): void
}

const staleMs = 30_000

const viewOf = (local: GitLocal, prefix: string): GitLocal => (local.repo ? { ...local, prefix } : local)

const headMoved = (before: GitLocal | undefined, after: GitLocal) =>
  !before?.repo || !after.repo || before.branch !== after.branch || before.head !== after.head || before.defaultBranch !== after.defaultBranch

export const watchTree = (layout: Layout, deps: TreeDeps): Tree => {
  const cwds = new Map<string, string>()
  let local: GitLocal | undefined
  let localPrint = ''
  let remote: GitRemote | undefined
  let remotePrint = ''
  let readAt = 0
  let stopped = false
  let wantRemote = false
  let forced = false

  const setLocal = (next: GitLocal, force: boolean) => {
    const print = JSON.stringify(next)
    if (print === localPrint && !force) return
    local = next
    localPrint = print
    for (const [cwd, prefix] of cwds) deps.broadcast(gitLocalChange, { cwd, local: viewOf(next, prefix) })
  }

  const setRemote = (next: GitRemote, force: boolean) => {
    const print = JSON.stringify(next)
    if (print === remotePrint && !force) return
    remote = next
    remotePrint = print
    for (const cwd of cwds.keys()) deps.broadcast(gitRemoteChange, { cwd, remote: next })
  }

  const gone = (error: unknown) => !existsSync(layout.root) || (error instanceof GitError && error.reason === 'not-a-repo')

  const readLocalOrGone = async (): Promise<GitLocal> => {
    try {
      return await readLocal(layout)
    } catch (error) {
      if (gone(error)) return { repo: false }
      throw error
    }
  }

  const read = async (withRemote: boolean, force: boolean) => {
    const before = local
    const next = await readLocalOrGone()
    readAt = Date.now()
    if (stopped) return
    setLocal(next, force)
    if (!next.repo) {
      remote = undefined
      remotePrint = ''
      return
    }
    if (!withRemote && !force && !headMoved(before, next)) return
    const nextRemote = await readRemote(next, deps.fetched(layout.commonDir))
    if (!stopped) setRemote(nextRemote, force)
  }

  const run = serialized(async () => {
    const withRemote = wantRemote
    const force = forced
    wantRemote = forced = false
    await read(withRemote, force).catch(error => deps.report(error))
  })

  const update = (withRemote = false, force = false) => {
    wantRemote ||= withRemote
    forced ||= force
    return run()
  }

  const unwatch = joinDisposers(
    deps.watcher.debounced(layout.root, { recursive: true, only: inWorkingTree }, () => void update(), debounceMs),
    layout.worktree ? deps.watcher.debounced(layout.gitDir, { recursive: true, only: inGitDir }, () => void update(true), debounceMs) : () => {},
  )

  return {
    layout,
    cwds,
    ready: update(true),
    status: (cwd, prefix) => ({ cwd, local: viewOf(local ?? { repo: false }, prefix), remote }),
    stale: () => Date.now() - readAt > staleMs,
    update,
    stop() {
      stopped = true
      unwatch()
    },
  }
}

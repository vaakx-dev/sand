import type { Dispose } from 'drydock'
import type { GitLocal, GitStatus } from '../contract'
import { createFetches } from '../fetch/schedule'
import { readLayout } from '../status/layout'
import { readStatus } from '../status/read'
import { createAttached } from './attached'
import { createLeases } from './leases'
import { createLocalListeners, type LocalListener } from './listeners'
import type { TreeDeps } from './tree'

export type WatchDeps = Omit<TreeDeps, 'fetched' | 'localChanged'>

export interface Watches {
  lease(cwd: string): Promise<GitStatus>
  watchLocal(cwd: string, listener: LocalListener): Dispose
  status(cwd: string): Promise<GitStatus>
  refresh(cwd: string): Promise<void>
  fetch(cwd: string): Promise<void>
  close(): void
}

const notRepo = (cwd: string): GitStatus => ({ cwd, local: { repo: false } })

export const createWatches = (deps: WatchDeps, refsMoved: (commonDir: string) => void): Watches => {
  let closed = false
  const listeners = createLocalListeners(deps.report)
  const fetches = createFetches(commonDir => attached.touch(commonDir))
  const attached = createAttached({
    tree: { ...deps, fetched: fetches.info, localChanged: listeners.send },
    joinFetches: commonDir => fetches.join(commonDir),
    refsMoved,
  })
  const leases = createLeases({ holding: listeners.holding, detach: attached.detach })

  const hold = async (cwd: string): Promise<GitLocal> => {
    const layout = await readLayout(cwd)
    if (closed || !layout || !listeners.holding(cwd)) return { repo: false }
    leases.keep(cwd, layout.root)
    const tree = attached.attach(cwd, layout)
    await tree.ready
    if (!listeners.holding(cwd)) leases.releaseUntimed(cwd)
    return tree.status(cwd, layout.prefix).local
  }

  const treeOf = async (cwd: string) => {
    const layout = await readLayout(cwd)
    return { layout, tree: layout && attached.tree(layout.root) }
  }

  return {
    async lease(cwd) {
      const layout = await readLayout(cwd)
      if (closed || !layout) {
        if (!closed) leases.renew(cwd, undefined)
        return notRepo(cwd)
      }
      const renewed = leases.renew(cwd, layout.root)
      const tree = attached.attach(cwd, layout)
      await tree.ready
      if (renewed && tree.stale()) void tree.update()
      return tree.status(cwd, layout.prefix)
    },
    watchLocal(cwd, listener) {
      const deliver = listeners.add(cwd, listener)
      hold(cwd)
        .then(local => {
          if (listeners.has(cwd, deliver)) deliver(local)
        })
        .catch(deps.report)
      return () => {
        if (listeners.remove(cwd, deliver)) leases.releaseUntimed(cwd)
      }
    },
    async status(cwd) {
      const { layout, tree } = await treeOf(cwd)
      if (!layout) return notRepo(cwd)
      if (!tree) return readStatus(cwd, layout, fetches.info(layout.commonDir))
      await tree.update(true)
      return tree.status(cwd, layout.prefix)
    },
    async refresh(cwd) {
      const { layout, tree } = await treeOf(cwd)
      if (layout) refsMoved(layout.commonDir)
      await tree?.update(true, true)
    },
    async fetch(cwd) {
      const layout = await readLayout(cwd)
      if (!layout) return
      await fetches.now(layout.commonDir)
      await attached.touch(layout.commonDir)
    },
    close() {
      closed = true
      leases.clear()
      listeners.clear()
      attached.close()
      fetches.close()
    },
  }
}

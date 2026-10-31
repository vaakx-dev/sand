import { joinDisposers } from '@sand/util'
import type { Dispose } from 'drydock'
import type { GitStatus } from '../contract'
import { createFetches } from '../fetch/schedule'
import { type Layout, readLayout } from '../status/layout'
import { readStatus } from '../status/read'
import { debounceMs, inGitDir } from './filters'
import { type Tree, type TreeDeps, watchTree } from './tree'

const leaseMs = 3 * 60_000

interface Lease {
  timer: Timer
  root?: string
}

interface Repo {
  trees: Set<string>
  stop: Dispose
}

export type WatchDeps = Omit<TreeDeps, 'fetched'>

export interface Watches {
  lease(cwd: string): Promise<GitStatus>
  status(cwd: string): Promise<GitStatus>
  refresh(cwd: string): Promise<void>
  fetch(cwd: string): Promise<void>
  close(): void
}

const notRepo = (cwd: string): GitStatus => ({ cwd, local: { repo: false } })

export const createWatches = (deps: WatchDeps): Watches => {
  const leases = new Map<string, Lease>()
  const trees = new Map<string, Tree>()
  const repos = new Map<string, Repo>()
  let closed = false

  const touchRepo = (commonDir: string) => Promise.all([...(repos.get(commonDir)?.trees ?? [])].map(root => trees.get(root)?.update(true)))

  const fetches = createFetches(touchRepo)
  const treeDeps: TreeDeps = { ...deps, fetched: fetches.info }

  const openRepo = (commonDir: string) => {
    const repo: Repo = {
      trees: new Set(),
      stop: joinDisposers(
        deps.watcher.debounced(commonDir, { recursive: true, only: inGitDir }, () => touchRepo(commonDir), debounceMs),
        fetches.join(commonDir),
      ),
    }
    repos.set(commonDir, repo)
    return repo
  }

  const attach = (cwd: string, layout: Layout) => {
    let tree = trees.get(layout.root)
    if (!tree) {
      tree = watchTree({ ...layout, prefix: '' }, treeDeps)
      trees.set(layout.root, tree)
      ;(repos.get(layout.commonDir) ?? openRepo(layout.commonDir)).trees.add(layout.root)
    }
    tree.cwds.set(cwd, layout.prefix)
    return tree
  }

  const detach = (cwd: string, root: string) => {
    const tree = trees.get(root)
    if (!tree) return
    tree.cwds.delete(cwd)
    if (tree.cwds.size) return
    tree.stop()
    trees.delete(root)
    const { commonDir } = tree.layout
    const repo = repos.get(commonDir)
    repo?.trees.delete(root)
    if (repo && !repo.trees.size) {
      repo.stop()
      repos.delete(commonDir)
    }
  }

  const release = (cwd: string) => {
    const lease = leases.get(cwd)
    if (!lease) return
    clearTimeout(lease.timer)
    leases.delete(cwd)
    if (lease.root) detach(cwd, lease.root)
  }

  const renew = (cwd: string, root: string | undefined) => {
    const held = leases.get(cwd)
    clearTimeout(held?.timer)
    if (held?.root && held.root !== root) detach(cwd, held.root)
    leases.set(cwd, { timer: setTimeout(() => release(cwd), leaseMs), root })
    return held?.root === root
  }

  const treeOf = async (cwd: string) => {
    const layout = await readLayout(cwd)
    return { layout, tree: layout && trees.get(layout.root) }
  }

  return {
    async lease(cwd) {
      const layout = await readLayout(cwd)
      if (closed || !layout) {
        if (!closed) renew(cwd, undefined)
        return notRepo(cwd)
      }
      const renewed = renew(cwd, layout.root)
      const tree = attach(cwd, layout)
      await tree.ready
      if (renewed && tree.stale()) void tree.update()
      return tree.status(cwd, layout.prefix)
    },
    async status(cwd) {
      const { layout, tree } = await treeOf(cwd)
      if (!layout) return notRepo(cwd)
      if (!tree) return readStatus(cwd, layout, fetches.info(layout.commonDir))
      await tree.update(true)
      return tree.status(cwd, layout.prefix)
    },
    async refresh(cwd) {
      const { tree } = await treeOf(cwd)
      await tree?.update(true, true)
    },
    async fetch(cwd) {
      const layout = await readLayout(cwd)
      if (!layout) return
      await fetches.now(layout.commonDir)
      await touchRepo(layout.commonDir)
    },
    close() {
      closed = true
      for (const lease of leases.values()) clearTimeout(lease.timer)
      for (const tree of trees.values()) tree.stop()
      for (const repo of repos.values()) repo.stop()
      leases.clear()
      trees.clear()
      repos.clear()
      fetches.close()
    },
  }
}

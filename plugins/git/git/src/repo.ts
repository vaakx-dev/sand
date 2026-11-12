import type { GitLocal, GitRepo, GitStatus } from './contract'
import { listBranches } from './branches/list'
import { createDefaults } from './default/defaults'
import { createLayouts } from './status/layout'
import { readLocal } from './status/local'
import { readWorktrees } from './status/worktrees'
import { createWatches, type WatchDeps } from './watch/watches'

export interface GitRepoHost {
  repo: GitRepo
  watch(cwd: string): Promise<GitStatus>
  close(): void
}

const notRepo: GitLocal = { repo: false }

export const createGitRepo = (deps: WatchDeps): GitRepoHost => {
  const layouts = createLayouts()
  const defaults = createDefaults(layouts)
  const watches = createWatches(deps, { layouts, defaults })
  return {
    repo: {
      status: watches.status,
      async local(cwd) {
        const layout = await layouts.read(cwd)
        return layout ? (await readLocal(layout, defaults.branchOf(layout))).local : notRepo
      },
      layout: layouts.read,
      worktrees: readWorktrees,
      async branches(cwd, query, limit) {
        const layout = await layouts.read(cwd)
        return layout ? listBranches(layout.root, defaults.branchOf(layout), query, limit) : { branches: [], total: 0 }
      },
      defaultBranch: defaults.branch,
      base: defaults.base,
      refresh: watches.refresh,
      fetch: watches.fetch,
      watchLocal: watches.watchLocal,
    },
    watch: watches.lease,
    close() {
      watches.close()
      defaults.clear()
      layouts.clear()
    },
  }
}

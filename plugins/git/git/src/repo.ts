import type { GitLocal, GitRepo, GitStatus } from './contract'
import { listBranches } from './branches/list'
import { createDefaults } from './default/defaults'
import { readLayout } from './status/layout'
import { readLocal } from './status/local'
import { createWatches, type WatchDeps } from './watch/watches'

export interface GitRepoHost {
  repo: GitRepo
  watch(cwd: string): Promise<GitStatus>
  close(): void
}

const local = async (cwd: string): Promise<GitLocal> => {
  const layout = await readLayout(cwd)
  return layout ? readLocal(layout) : { repo: false }
}

export const createGitRepo = (deps: WatchDeps): GitRepoHost => {
  const defaults = createDefaults()
  const watches = createWatches(deps, defaults.forget)
  return {
    repo: {
      status: watches.status,
      local,
      branches: listBranches,
      defaultBranch: defaults.branch,
      base: defaults.base,
      refresh: watches.refresh,
      fetch: watches.fetch,
    },
    watch: watches.lease,
    close() {
      watches.close()
      defaults.clear()
    },
  }
}

import { joinDisposers } from '@sand/util'
import type { Dispose } from 'drydock'
import type { GitLayout } from '../contract'
import { debounceMs, inGitDir } from './filters'
import { type Tree, type TreeDeps, watchTree } from './tree'

interface Repo {
  trees: Set<string>
  stop: Dispose
}

export interface AttachDeps {
  tree: TreeDeps
  joinFetches(commonDir: string): Dispose
  refsMoved(commonDir: string): void
}

export const createAttached = ({ tree: treeDeps, joinFetches, refsMoved }: AttachDeps) => {
  const trees = new Map<string, Tree>()
  const repos = new Map<string, Repo>()

  const touch = (commonDir: string) => {
    refsMoved(commonDir)
    return Promise.all([...(repos.get(commonDir)?.trees ?? [])].map(root => trees.get(root)?.update(true)))
  }

  const openRepo = (commonDir: string) => {
    const repo: Repo = {
      trees: new Set(),
      stop: joinDisposers(
        treeDeps.watcher.debounced(commonDir, { recursive: true, only: inGitDir }, () => touch(commonDir), debounceMs),
        joinFetches(commonDir),
      ),
    }
    repos.set(commonDir, repo)
    return repo
  }

  return {
    touch,
    tree: (root: string) => trees.get(root),
    attach(cwd: string, layout: GitLayout) {
      let tree = trees.get(layout.root)
      if (!tree) {
        tree = watchTree({ ...layout, prefix: '' }, treeDeps)
        trees.set(layout.root, tree)
        ;(repos.get(layout.commonDir) ?? openRepo(layout.commonDir)).trees.add(layout.root)
      }
      tree.cwds.set(cwd, layout.prefix)
      return tree
    },
    detach(cwd: string, root: string) {
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
    },
    close() {
      for (const tree of trees.values()) tree.stop()
      for (const repo of repos.values()) repo.stop()
      trees.clear()
      repos.clear()
    },
  }
}

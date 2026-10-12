import { commonDirOf, fetchOrigin } from '@sand/kit/git'
import type { Context } from 'drydock'
import { watchedRepos, type WatchedRepos } from './repos'

export const freshness = (ctx: Context) => {
  const changed = () => ctx.server?.broadcast('git.change', [])
  let repos: WatchedRepos | undefined
  ctx.watch('watcher', watcher => {
    if (!watcher) return
    const watched = watchedRepos(watcher, changed)
    repos = watched
    return () => {
      repos = undefined
      watched.close()
    }
  })
  return async (cwd: string) => {
    const repo = await commonDirOf(cwd)
    if (!repo) return
    repos?.touch(repo)
    if (await fetchOrigin(cwd)) changed()
  }
}

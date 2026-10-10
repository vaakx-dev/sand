import type { ProjectGroup } from '@sand/web-client/contract'
import type { ProjectsContext } from './types'

export const refreshStates = (ctx: ProjectsContext, groups: ProjectGroup[], done: Set<string>) => {
  const sync = ctx.sync
  if (!sync) return
  for (const group of groups) {
    if (group.locations.length < 2) continue
    for (const entry of group.locations) {
      const key = `${entry.device ?? ''}\0${entry.path}`
      if (done.has(key) || entry.missing || !ctx.machines.online(entry.device)) continue
      done.add(key)
      sync.refresh(entry).catch(() => undefined)
    }
  }
}

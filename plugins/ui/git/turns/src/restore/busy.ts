import type { GitPlace } from '@sand/git/contract'
import { isInside, samePath } from '@sand/util'
import type { TurnsContext } from '../inject'

const inFolder = (path: string, folder: string) => samePath(path, folder) || isInside(path, folder)

const rootOf = (ctx: TurnsContext, place: GitPlace) => {
  const local = ctx.gitStatus.current(place)?.local
  return local?.repo ? local.root : place.cwd
}

export const busyReason = (ctx: TurnsContext, place: GitPlace) => {
  const root = rootOf(ctx, place)
  const busy = ctx.threads.list().some(thread => thread.running && thread.device === place.device && inFolder(thread.info.cwd, root))
  return busy ? 'Stop the chats working in this folder first' : ''
}

import type { WorkspaceContext } from '../inject'
import { inFolder } from '../worktrees/find'

export interface Watched {
  id: string
  cwd: string
  device: string
}

export const watchedThread = (ctx: WorkspaceContext): Watched | undefined => {
  const chat = ctx.threads.current()
  return chat && chat.info.kind !== 'quick' ? { id: chat.id, cwd: chat.info.cwd, device: chat.device } : undefined
}

export const sameWatch = (a: Watched | undefined, b: Watched | undefined) => a?.id === b?.id && a?.cwd === b?.cwd && a?.device === b?.device

export const watches = (watched: Watched | undefined, about: { path: string; session?: string }, device: string) =>
  Boolean(watched && device === watched.device && (about.session === watched.id || inFolder(watched.cwd, about.path)))

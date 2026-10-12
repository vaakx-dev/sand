import type { StashOrigin } from '../contract'
import type {} from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const originOf = (ctx: Context<'threads'>): StashOrigin => {
  const thread = ctx.threads.current()
  if (thread) return { cwd: thread.info.cwd, device: thread.device, thread: thread.id, title: thread.info.title ?? undefined }
  const draft = ctx.threads.drafting()
  return { cwd: draft?.cwd ?? ctx.threads.cwd(), device: draft?.device ?? ctx.threads.device() }
}

export const folderName = (cwd: string) => cwd.split(/[\\/]/).filter(Boolean).at(-1) ?? cwd

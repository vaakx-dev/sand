import { threadOwners, threadRoute, threadView } from '@sand/chat/contract'
import type { ChipScope, Shell } from '@sand/ui-shell/contract'
import type { Context } from 'drydock'

export const owned = (ctx: Context, thread: string) => Boolean(ctx.get(threadOwners)?.owner(thread))

export const inScope = (ctx: Context, scope: ChipScope, thread: string) => {
  const owner = ctx.get(threadOwners)?.owner(thread)
  return scope.kind === 'general' ? !owner : owner?.id === scope.owner
}

export const openThread = (ctx: Context, shell: Shell, thread: string) => {
  const view = ctx.get(threadView)
  if (view) return view.open(thread)
  shell.open({ kind: threadRoute, id: thread })
}

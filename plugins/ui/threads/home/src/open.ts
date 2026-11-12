import { threadRoute, threadView } from '@sand/chat/contract'
import type { Shell } from '@sand/ui-shell/contract'
import type { Context } from 'drydock'

export const openThread = (ctx: Context, shell: Shell, thread: string) => {
  const view = ctx.get(threadView)
  if (view) return view.open(thread)
  shell.open({ kind: threadRoute, id: thread })
}

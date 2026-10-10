import type { Thread } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const familyLoader = (ctx: Context<'threads'>) => {
  let asked: string | undefined
  return (thread: Thread, family: Thread[]) => {
    if (asked !== thread.id) {
      asked = thread.id
      void ctx.threads.children(thread.id)
    }
    for (const member of family) {
      if (!member.loaded && !member.failed) void ctx.threads.load(member.id)
      else if (member.loaded && !member.complete) void ctx.threads.full(member.id)
    }
  }
}

import { errorMessage } from '@sand/dom'
import type { Context } from 'drydock'

export type ActionContext = Context<'composer' | 'threads' | 'turns' | 'gitStatus'>

const open = async (ctx: ActionContext) => {
  const current = ctx.threads.current()
  if (current) return current
  const thread = await ctx.threads.create({ settings: ctx.models?.draft() })
  ctx.models?.prepare()
  await ctx.threads.select(thread.id)
  return thread
}

export const sendMessage = async (ctx: ActionContext, text: string) => {
  try {
    const thread = await open(ctx)
    await ctx.turns.send(thread.id, text, text)
  } catch (error) {
    ctx.notify?.push(`Could not send "${text}": ${errorMessage(error)}`, { level: 'error' })
  }
}

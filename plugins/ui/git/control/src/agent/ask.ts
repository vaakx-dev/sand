import { turns } from '@sand/web-client/contract'
import type { ControlContext } from '../inject'
import type { AgentPrompt } from './prompts'

export const canAsk = (ctx: ControlContext, thread: string | undefined) => Boolean(thread && ctx.get(turns))

export const askAgent = (ctx: ControlContext, thread: string | undefined, prompt: AgentPrompt) => {
  const sender = ctx.get(turns)
  if (!thread || !sender) return
  void sender.send(thread, prompt.text, prompt.label).catch(error => ctx.report(error))
}

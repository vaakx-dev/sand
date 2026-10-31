import type { llm } from '@sand/accounts/contract'
import { sessions } from '@sand/chats/contract'
import { modelSettings } from '@sand/model/contract'
import { usageRecord } from '@sand/usage/records'
import type { Context } from 'drydock'
import type { AskConfig } from './config'
import type { AskRequest } from './contract'
import { chooseModel } from './model'
import { reply } from './reply'

export type AskContext = Context<{ llm: typeof llm }>

const charsPerToken = 4
const promptShare = 0.6

const capped = (prompt: string, context: number | undefined) => (context ? prompt.slice(0, Math.floor(context * promptShare * charsPerToken)) : prompt)

export const createText = (ctx: AskContext, config: AskConfig) => async (request: AskRequest) => {
  const session = request.session ? ctx.get(sessions)?.open(request.session) : undefined
  const model = chooseModel(ctx.llm, ctx.get(modelSettings), config.model, session)
  const text = capped(request.prompt, ctx.llm.find?.(model)?.context)
  const release = ctx.busy()
  try {
    const answer = await reply(
      ctx.llm,
      { system: request.system, messages: [{ role: 'user', content: [{ type: 'text', text }] }], tools: [], model },
      request.signal,
    )
    session?.append('usage', usageRecord(ctx.llm.provider?.(model), model, answer.usage, answer.source))
    return answer.text
  } finally {
    release()
  }
}
